define(function (require) {

  function makeDirectiveDef(id, compare) {
    return function ($parse) {
      return {
        require: 'ngModel',
        link: function ($scope, $el, $attr, ngModel) {
          let getBound = function () { return $parse($attr[id])(); };
          let defaultVal = {
            'greaterThan': -Infinity,
            'lessThan': Infinity
          }[id];

          ngModel.$parsers.push(validate);
          ngModel.$formatters.push(validate);

          $scope.$watch(getBound, function () {
            validate(ngModel.$viewValue);
          });

          function validate(val) {
            let bound = !isNaN(getBound()) ? +getBound() : defaultVal;
            let valid = !isNaN(bound) && !isNaN(val) && compare(val, bound);
            ngModel.$setValidity(id, valid);
            return val;
          }
        }
      };
    };
  }

  require('ui/modules')
    .get('kibana')
    .directive('greaterThan', makeDirectiveDef('greaterThan', function (a, b) {
      return a > b;
    }))
    .directive('lessThan', makeDirectiveDef('lessThan', function (a, b) {
      return a < b;
    }));
});
