define(function (require) {
  var _ = require('lodash');
  var DateMath = require('utils/datemath');

  require('modules').get('kibana').directive('validateDateMath', function () {
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
          var moment = DateMath.parse(input);
          ngModel.$setValidity('validDateMath', moment != null && moment.isValid());
          return input;
        }
      }
    };
  });
});