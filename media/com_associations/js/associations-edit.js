/**
* PLEASE DO NOT MODIFY THIS FILE. WORK ON THE ES6 VERSION.
* OTHERWISE YOUR CHANGES WILL BE REPLACED ON THE NEXT BUILD.
**/

/**
 * @copyright   Copyright (C) 2005 - 2019 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */
Joomla = window.Joomla || {};

(function (Joomla, document) {
  'use strict';

  Joomla.hideAssociation = function (formControl, languageCode) {
    var controlGroup = [].slice.call(document.querySelectorAll('#associations .control-group'));
    controlGroup.forEach(function (element) {
      // Current selected language. Hide it
      var el = element.querySelector('.control-label label');

      if (el) {
        var attribute = el.getAttribute('for');

        if (attribute.replace(new RegExp('_name$'), '') === "".concat(formControl, "_associations_").concat(languageCode.replace('-', '_'))) {
          element.style.display = 'none';
        }
      }
    });
  };

  Joomla.showAssociationMessage = function () {
    var controlGroup = [].slice.call(document.querySelectorAll('#associations .control-group'));
    var associations = document.getElementById('associations');

    if (associations) {
      var html = document.createElement('joomla-alert');
      html.innerHTML = Joomla.JText._('JGLOBAL_ASSOC_NOT_POSSIBLE');
      associations.insertAdjacentElement('afterbegin', html);
    }

    controlGroup.forEach(function (element) {
      element.style.display = 'none';
    });
  };
  /**
   * Inject associations into other association fields
   *
   * This function is called whenever the Ajax request within propagateAssociation() completes
   * successfully.
   * Its purpose is to inject the associations which have been returned in the Ajax response into
   * the other association fields in the form.
   * It does this by invoking the various callback functions of those association fields (i.e. the
   * function which gets called whenever the administrator selects an association via the modal),
   * and passing the appropriate associated record details.
   *
   * @param   result                  The response from the Ajax request.
   *                                  Its structure is that generated by the JResponseJson class,
   *                                  with the data field containing the associations
   * @param   callbackFunctionPrefix  The name of the callback function which the modal window uses
   *                                  to set the selected item as the association, but minus the
   *                                  language tag at the end
   *
   * @return  boolean
   *
   * @since   3.9.0
   */


  Joomla.injectAssociations = function (result, callbackFunctionPrefix) {
    var functionName;

    if (result.success) {
      if (result.data.length !== 0) {
        [].slice.call(Object.keys(result.data)).forEach(function (lang) {
          functionName = callbackFunctionPrefix + lang.replace('-', '_'); // eslint-disable-next-line max-len

          window[functionName](result.data[lang].id, result.data[lang].title, result.data[lang].catid, null, null, lang);
        });
      }

      if (result.message) {
        Joomla.renderMessages({
          notice: [result.message]
        });
      }
    } else {
      Joomla.renderMessages({
        warning: [Joomla.JText._('JGLOBAL_ASSOCIATIONS_PROPAGATE_FAILED')]
      });
    }
  };
  /**
   * Propagate associations from this field into other association fields
   *
   * This function is called whenever an administrator populates an association (in the association
   * modal field) and then clicks on the Propagate button.
   * The purpose of this function is to find what other records (if any) are associated with the
   * one which the administrator has selected, and populate the other association fields with these
   * records. (Otherwise, if the administrator just clicks on Save without clicking on Propagate,
   * those other associations will be deleted). It does this by finding the id of the selected
   * associated record (from a hidden field) and makes an Ajax call to the server to find the other
   * associations, also passing up the language of the record currently being edited, as it should
   * be excluded. Once it has received from the server the other associations it calls
   * injectAssociations to inject them into the other association fields within the form.
   *
   * @param   fieldPrefix             The stem of the html ids for the elements comprising the
   *                                  modal field
   * @param   callbackFunctionPrefix  The name of the callback function which the modal window uses
   *                                  to set the selected item as the association, but minus the
   *                                  language tag at the end
   *
   * @return  boolean
   *
   * @since   3.9.0
   */


  Joomla.propagateAssociation = function (fieldPrefix, callbackFunctionPrefix) {
    // Find the id of the record which has been set as an association
    var assocId = document.getElementById("".concat(fieldPrefix, "_id")).value; // Find the language of the record being edited

    var languageField = document.getElementById('jform_language');
    var currentLang = languageField.options[languageField.selectedIndex].value;
    var data = {
      task: 'ajax.fetchAssociations',
      format: 'json',
      assocId: assocId,
      excludeLang: currentLang
    };
    data[Joomla.getOptions('csrf.token', '')] = 1;
    var queryString = Object.keys(data).reduce(function (a, k) {
      a.push("".concat(k, "=").concat(encodeURIComponent(data[k])));
      return a;
    }, []).join('&');
    var url = "".concat(document.forms.adminForm.action, "&").concat(queryString);
    Joomla.request({
      // Find the action url associated with the form - we need to add the token to this
      url: url,
      method: 'GET',
      data: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
      onSuccess: function onSuccess(response) {
        Joomla.injectAssociations(JSON.parse(response), callbackFunctionPrefix);
      },
      onError: function onError() {
        Joomla.renderMessages({
          warning: [Joomla.JText._('JGLOBAL_ASSOCIATIONS_PROPAGATE_FAILED')]
        });
      }
    });
    return false;
  };

  document.addEventListener('DOMContentLoaded', function () {
    var associationsEditOptions = Joomla.getOptions('system.associations.edit');
    var formControl = associationsEditOptions.formControl || 'jform';
    var formControlLanguage = document.getElementById("".concat(formControl, "_language")); // Hide the associations tab if needed

    if (parseInt(associationsEditOptions.hidden, 10) === 1) {
      Joomla.showAssociationMessage();
    } else if (formControlLanguage) {
      // Hide only the associations for the current language
      Joomla.hideAssociation(formControl, formControlLanguage.value);
    } // When changing the language


    if (formControlLanguage) {
      formControlLanguage.addEventListener('change', function (event) {
        // Remove message if any
        Joomla.removeMessages();
        var existsAssociations = false;
        /** For each language, remove the associations, ie,
         *  empty the associations fields and reset the buttons to Select/Create
         */

        var controlGroup = [].slice.call(document.querySelectorAll('#associations .control-group'));
        controlGroup.forEach(function (element) {
          var attribute = element.querySelector('.control-label label').getAttribute('for');
          var languageCode = attribute.replace('_name', '').replace('jform_associations_', ''); // Show the association fields

          element.style.display = 'block'; // Check if there was an association selected for this language

          if (!existsAssociations && document.getElementById("".concat(formControl, "_associations_").concat(languageCode, "_name")).value !== '') {
            existsAssociations = true;
          } // Call the modal clear button


          var clear = document.getElementById("".concat(formControl, "_associations_").concat(languageCode, "_clear"));

          if (clear.onclick) {
            clear.onclick();
          } else if (clear.click) {
            clear.click();
          }
        }); // If associations existed, send a warning to the user

        if (existsAssociations) {
          Joomla.renderMessages({
            warning: [Joomla.JText._('JGLOBAL_ASSOCIATIONS_RESET_WARNING')]
          });
        } // If the selected language is All hide the fields and add a message


        var selectedLanguage = event.target.value;

        if (selectedLanguage === '*') {
          Joomla.showAssociationMessage();
        } else {
          // Else show the associations fields/buttons and hide the current selected language
          Joomla.hideAssociation(formControl, selectedLanguage);
        }
      });
    }
  });
})(Joomla, document);