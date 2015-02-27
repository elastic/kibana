define(function (require) {
  var module = require('modules').get('kibana');

  module.directive('autoSelectIfOnlyOne', function ($parse) {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        autoSelectIfOnlyOne: '&autoSelectIfOnlyOne'
      },
      link: function (scope, element, attributes, ngModelCtrl) {
        scope.$watch('autoSelectIfOnlyOne', function (result) {
          var options = result();
          if (options && options.length === 1) {
            ngModelCtrl.$setViewValue(options[0]);
            ngModelCtrl.$render();
          }
        });
      }
    };
  });
});