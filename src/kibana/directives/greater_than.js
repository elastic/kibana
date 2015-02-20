define(function (require) {
  require('modules')
  .get('kibana')
  .directive('greaterThan', function () {
    return {
      require: 'ngModel',
      link: function ($scope, $el, $attr, ngModel) {
        var val = $attr.greaterThan || 0;
        ngModel.$parsers.push(validator);
        ngModel.$formatters.push(validator);

        function validator(value) {
          var valid = false;
          if (!isNaN(value)) valid = value > val;
          ngModel.$setValidity('greaterThan', valid);
          return value;
        }
      }
    };
  });
});