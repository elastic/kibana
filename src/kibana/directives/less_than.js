define(function (require) {
  require('modules')
    .get('kibana')
    .directive('lessThan', function () {
      return {
        require: ['ngModel', '^form'],
        link: function ($scope, $el, $attr, controllers) {
          var ngModel = controllers[0];
          var ngForm = controllers[1];

          ngModel.$parsers.push(validator);
          ngModel.$formatters.push(validator);

          function validator(value) {
            var otherElem = ngForm[$attr.lessThan];
            var val = +otherElem.$modelValue || 0;
            var valid = false;
            var hasCompliment = ngForm.$error.greaterThan && ngForm.$error.greaterThan
            .reduce(function (last, curr) {
              return last || (curr === otherElem ? otherElem : false);
            }, false);

            if (!isNaN(value)) valid = +value < val;
            if (hasCompliment) {
              otherElem.$setValidity('greaterThan', valid); // Set Validity of other element
            }
            ngModel.$setValidity('lessThan', valid);

            return value;
          }
        }
      };
    });
});
