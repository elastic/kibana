define(function (require) {
  let module = require('ui/modules').get('kibana');

  module.directive('inputWholeNumber', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, $elem, attrs, ngModel) {
        ngModel.$parsers.push(checkWholeNumber);
        ngModel.$formatters.push(checkWholeNumber);

        function checkWholeNumber(value) {
          ngModel.$setValidity('whole', value % 1 === 0);
          return value;
        }
      }
    };
  });
});
