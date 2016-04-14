define(function (require) {
  let _ = require('lodash');
  let dateMath = require('ui/utils/dateMath');

  require('ui/modules').get('kibana').directive('validateDateMath', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        'ngModel': '='
      },
      link: function ($scope, elem, attr, ngModel) {
        ngModel.$parsers.unshift(validateDateMath);
        ngModel.$formatters.unshift(validateDateMath);

        function validateDateMath(input) {
          if (input == null || input === '') {
            ngModel.$setValidity('validDateMath', true);
            return null;
          }

          let moment = dateMath.parse(input);
          ngModel.$setValidity('validDateMath', moment != null && moment.isValid());
          return input;
        }
      }
    };
  });
});
