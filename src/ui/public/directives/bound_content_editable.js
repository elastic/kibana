/**
 * This directive creates a contenteditable element which is data-bound to a model.
 */

import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('boundContentEditable', () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: (scope, element, attrs, ngModel) => {
      // Set contenteditable so you don't have to do this in the markup.
      element.attr('contenteditable', 'true');

      function read() {
        ngModel.$setViewValue(element.html());
      }

      ngModel.$render = () => {
        // Read from the model and display it within the element.
        element.html(ngModel.$viewValue || '');
      };

      element.bind('blur keyup change', () => {
        // On interaction, update the model with the user's input.
        scope.$apply(read);
      });
    }
  };
});
