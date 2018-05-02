/**
 * This directive can be applied to an element, that has also aria-activedescendant applied.
 * It will make sure, that whenever aria-activedescendant changes, the new element
 * referenced by it, will be scrolled into visible view, by calling its `scrollIntoView`
 * method.
 */

import { uiModules } from '../modules';

uiModules.get('kibana')
  .directive('scrolltoActivedescendant', () => ({
    link(scope, element, attrs) {
      scope.$watch(() => attrs.ariaActivedescendant, (val) => {
        if (val) {
          const activeDescendant = element.find(`#${val}`);
          if (activeDescendant.length) {
            activeDescendant[0].scrollIntoView();
          }
        }
      });
    }
  }));
