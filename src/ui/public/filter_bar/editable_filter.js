define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');

  require('ui/modules')
  .get('kibana')
  .directive('editableFilter', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, $el, attrs, ngModelCntrl) {
        ngModelCntrl.$formatters.push(toJSON);
        ngModelCntrl.$parsers.push(fromJSON);

        function fromJSON(value) {
          try {
            value = JSON.parse(value);
            var definedFilter = _.keys(value).length > 0;
            ngModelCntrl.$setValidity('editableFilter', definedFilter);
          } catch (e) {
            ngModelCntrl.$setValidity('editableFilter', false);
          }
          return value;
        }

        function toJSON(value) {
          return angular.toJson(value, 2);
        }
      }
    };
  });

});
