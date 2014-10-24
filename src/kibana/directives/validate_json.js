define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var module = require('modules').get('kibana');

  module.directive('validateJson', function ($compile) {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        'ngModel': '=',
        'queryInput': '=?',
      },
      link: function ($scope, $elem, attr, ngModel) {
        var debouncedValidator = _.debounce(validator, 200, {
          leading: true,
          trailing: true
        });

        $scope.$watch('ngModel', debouncedValidator);

        function validator(newValue, oldValue) {
          if (newValue.length === 0) {
            setValid();
            return;
          }

          try {
            JSON.parse(newValue);
            setValid();
          } catch (err) {
            setInvalid();
          }
        }

        function setValid() {
          ngModel.$setValidity('jsonInput', true);
        }

        function setInvalid() {
          ngModel.$setValidity('jsonInput', false);
        }
      }
    };
  });
});
