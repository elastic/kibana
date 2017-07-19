import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('inputNumber', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function ($scope, $elem, attrs, ngModel) {
      ngModel.$parsers.push(checkNumber);
      ngModel.$formatters.push(checkNumber);

      function checkNumber(value) {
        ngModel.$setValidity('number', !isNaN(parseFloat(value)));
        return value;
      }
    }
  };
});
