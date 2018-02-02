/**
 * The `kbn-ui-ace-keyboard-mode` directive should be used on any element, that
 * `ui-ace` is used on. It will prevent the keyboard trap, that ui-ace usually
 * has, i.e. tabbing into the box won't give you any possibilities to leave
 * it via keyboard again, since tab inside the textbox works like a tab character.
 *
 * This directive won't change anything, if the user uses the mouse. But if she
 * tabs to the ace editor, an overlay will be shown, that you have to press Enter
 * to enter editing mode, and that it can be left by pressing Escape again.
 *
 * That way the ui-ace editor won't trap keyboard focus, and won't cause that
 * accessibility issue anymore.
 */

import angular from 'angular';
import { uiModules } from 'ui/modules';
import './kbn_ui_ace_keyboard_mode.less';
import { keyCodes } from '@elastic/eui';

let aceKeyboardModeId = 0;

uiModules.get('kibana')
  .factory('kbnUiAceKeyboardModeService', () => ({
    initialize(scope, element) {
      const uniqueId = `uiAceKeyboardHint-${scope.$id}-${aceKeyboardModeId++}`;

      const hint = angular.element(
        `<div
          class="uiAceKeyboardHint"
          id="${uniqueId}"
          tabindex="0"
          role="application"
        >
          <p class="kuiText kuiVerticalRhythmSmall">
            Press Enter to start editing.
          </p>
          <p class="kuiText kuiVerticalRhythmSmall">
            When you&rsquo;re done, press Escape to stop editing.
          </p>
        </div>`
      );

      const uiAceTextbox = element.find('textarea');

      function startEditing() {
        // We are not using ng-class in the element, so that we won't need to $compile it
        hint.addClass('uiAceKeyboardHint-isInactive');
        uiAceTextbox.focus();
      }

      function enableOverlay() {
        hint.removeClass('uiAceKeyboardHint-isInactive');
      }

      hint.keydown((ev) => {
        if (ev.keyCode === keyCodes.ENTER) {
          ev.preventDefault();
          startEditing();
        }
      });

      uiAceTextbox.blur(() => {
        enableOverlay();
      });

      let isAutoCompleterOpen;

      // We have to capture this event on the 'capture' phase, otherewise Ace will have already
      // dismissed the autocompleter when the user hits ESC.
      document.addEventListener('keydown', () => {
        const autoCompleter = document.querySelector('.ace_autocomplete');

        if (!autoCompleter) {
          isAutoCompleterOpen = false;
          return;
        }

        // The autoComplete is just hidden when it's closed, not removed from the DOM.
        isAutoCompleterOpen = autoCompleter.style.display !== 'none';
      }, { capture: true });

      uiAceTextbox.keydown((ev) => {
        if (ev.keyCode === keyCodes.ESCAPE) {
          // If the autocompletion context menu is open then we want to let ESC close it but
          // **not** exit out of editing mode.
          if (!isAutoCompleterOpen) {
            ev.preventDefault();
            ev.stopPropagation();
            enableOverlay();
            hint.focus();
          }
        }
      });

      hint.click(startEditing);
      // Prevent tabbing into the ACE textarea, we now handle all focusing for it
      uiAceTextbox.attr('tabindex', '-1');
      element.prepend(hint);
    }
  }))
  .directive('kbnUiAceKeyboardMode', (kbnUiAceKeyboardModeService) => ({
    restrict: 'A',
    link(scope, element) {
      kbnUiAceKeyboardModeService.initialize(scope, element);
    }
  }));
