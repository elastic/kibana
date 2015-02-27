define(function (require) {
  var module = require('modules').get('kibana');

  module.directive('inputFocus', function ($timeout) {
    return {
      restrict: 'A',
      link: function ($scope, $elem, attrs) {
        $timeout(function () {
          $elem.focus();
          if (attrs.inputFocus === 'select') $elem.select();
        });
      }
    };
  });
});