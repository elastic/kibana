import uiModules from 'ui/modules';

function makeDirectiveDef(id, compare) {
  return function ($parse) {
    return {
      require: 'ngModel',
      link: function ($scope, $el, $attr, ngModel) {
        const getBound = function () { return $parse($attr[id])(); };
        const defaultVal = {
          'greaterThan': -Infinity,
          'greaterOrEqualThan': -Infinity,
          'lessThan': Infinity
        }[id];

        ngModel.$parsers.push(validate);
        ngModel.$formatters.push(validate);

        $scope.$watch(getBound, function () {
          validate(ngModel.$viewValue);
        });

        function validate(val) {
          const bound = !isNaN(getBound()) ? +getBound() : defaultVal;
          const valid = !isNaN(bound) && !isNaN(val) && compare(val, bound);
          ngModel.$setValidity(id, valid);
          return val;
        }
      }
    };
  };
}

uiModules
  .get('kibana')
  .directive('greaterThan', makeDirectiveDef('greaterThan', function (a, b) {
    return a > b;
  }))
  .directive('lessThan', makeDirectiveDef('lessThan', function (a, b) {
    return a < b;
  }))
  .directive('greaterOrEqualThan', makeDirectiveDef('greaterOrEqualThan', function (a, b) {
    return a >= b;
  }));
