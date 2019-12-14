/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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

import { accessibleClickKeys, keyCodes } from '@elastic/eui';
import { uiModules } from '../modules';

uiModules.get('kibana').directive('kbnAccessibleClick', function() {
  return {
    restrict: 'A',
    controller: $element => {
      $element.on('keydown', e => {
        // Prevent a scroll from occurring if the user has hit space.
        if (e.keyCode === keyCodes.SPACE) {
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
        throw new Error(
          `kbnAccessibleClick doesn't need to be used on a link if it has a href attribute.`
        );
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
