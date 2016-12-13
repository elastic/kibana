import uiModules from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('autoSelectIfOnlyOne', function ($parse) {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, element, attributes, ngModelCtrl) {
      attributes.$observe('autoSelectIfOnlyOne', function (result) {
        const options = $parse(result)(scope);
        if (options && options.length === 1) {
          ngModelCtrl.$setViewValue(options[0]);
          ngModelCtrl.$render();
        }
      });
    }
  };
});
