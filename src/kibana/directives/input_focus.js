define(function (require) {
  var module = require('modules').get('kibana');

  module.directive('inputFocus', function ($timeout) {
    return {
      restrict: 'A',
      link: function ($scope, $elem, attrs) {
        $timeout(function () {
          var method = (attrs.inputFocus && attrs.inputFocus === 'select') ? 'select' : 'focus';
          $elem[0][method]();
        });
      }
    };
  });
});