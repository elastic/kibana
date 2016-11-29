import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('validateLowercase', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function ($scope, elem, attr, ctrl) {
      ctrl.$validators.lowercase = function (modelValue, viewValue) {
        if (ctrl.$isEmpty(modelValue)) {
          // consider empty models to be valid per lowercase rules
          return true;
        }

        return viewValue.toLowerCase() === viewValue;
      };
    }
  };
});

