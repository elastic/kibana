define(function (require) {
  var module = require('modules').get('kibana');

  module.directive('inputFocus', function ($timeout) {
    return {
      restrict: 'A',
      link: function ($scope, $elem, attrs) {
        $timeout(function () {
          $elem[0].focus();
        });
      }
    };
  });
});