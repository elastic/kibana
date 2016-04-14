define(function (require) {
  let module = require('ui/modules').get('kibana');

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
