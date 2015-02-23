define(function (require) {
  var module = require('modules').get('kibana');

  module.directive('autoSelectIfOnlyOne', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, element, attributes, ngModelCtrl) {
        scope.$watch(attributes.autoSelectIfOnlyOne, function (options) {
          if (options && options.length === 1) {
            ngModelCtrl.$setViewValue(options[0]);
            ngModelCtrl.$render();
          }
        });
      }
    };
  });
});