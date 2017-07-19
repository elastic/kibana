/**
 * Interactive elements must be able to receive focus.
 *
 * Ideally, this means using elements that are natively keyboard accessible (<a href="">,
 * <input type="button">, or <button>). Note that links should be used when navigating and buttons
 * should be used when performing an action on the page.
 *
 * If you need to use a <div>, <p>, or <a> without the href attribute, then you need to allow
 * them to receive focus and to respond to keyboard input. The workaround is to:
 *
 *   - Give the element tabindex="0" so that it can receive keyboard focus.
 *   - Add a JavaScript onkeyup event handler that triggers element functionality if the Enter key
 *     is pressed while the element is focused. This is necessary because some browsers do not trigger
 *    onclick events for such elements when activated via the keyboard.
 *   - If the item is meant to function as a button, the onkeyup event handler should also detect the
 *     Spacebar in addition to the Enter key, and the element should be given role="button".
 *
 * Apply this directive to any of these elements to automatically do the above.
 */

import {
  accessibleClickKeys,
  SPACE_KEY,
} from 'ui_framework/services';
import { uiModules } from 'ui/modules';

uiModules.get('kibana')
.directive('kbnAccessibleClick', function () {
  return {
    restrict: 'A',
    controller: $element => {
      $element.on('keydown', e => {
        // Prevent a scroll from occurring if the user has hit space.
        if (e.keyCode === SPACE_KEY) {
          e.preventDefault();
        }
      });
    },
    link: (scope, element, attrs) => {
      // The whole point of this directive is to hack in functionality that native buttons provide
      // by default.
      const elementType = element.prop('tagName');

      if (elementType === 'BUTTON') {
        throw new Error(`kbnAccessibleClick doesn't need to be used on a button.`);
      }

      if (elementType === 'A' && attrs.href !== undefined) {
        throw new Error(`kbnAccessibleClick doesn't need to be used on a link if it has a href attribute.`);
      }

      // We're emulating a click action, so we should already have a regular click handler defined.
      if (!attrs.ngClick) {
        throw new Error('kbnAccessibleClick requires ng-click to be defined on its element.');
      }

      // If the developer hasn't already specified attributes required for accessibility, add them.
      if (attrs.tabindex === undefined) {
        element.attr('tabindex', '0');
      }

      if (attrs.role === undefined) {
        element.attr('role', 'button');
      }

      element.on('keyup', e => {
        // Support keyboard accessibility by emulating mouse click on ENTER or SPACE keypress.
        if (accessibleClickKeys[e.keyCode]) {
          // Delegate to the click handler on the element (assumed to be ng-click).
          element.click();
        }
      });
    },
  };
});
