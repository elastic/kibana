import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('autoSelectIfOnlyOne', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, element, attributes, ngModelCtrl) {
      scope.$watchCollection(attributes.autoSelectIfOnlyOne, (options) => {
        if (options && options.length === 1) {
          ngModelCtrl.$setViewValue(options[0]);
          ngModelCtrl.$render();
        }
      });
    }
  };
});
