const SenseEditor = require('../sense_editor/editor');
const exampleText = require('raw!./helpExample.txt');

require('ui/modules')
.get('app/sense')
.directive('senseHelpExample', function () {
  return {
    restrict: 'E',
    link: function ($scope, $el) {
      $el.text(exampleText);
      $scope.editor = new SenseEditor($el);
      $scope.editor.setReadOnly(true);

      $scope.$on('$destroy', function () {
        if ($scope.editor) $scope.editor.destroy();
      });
    }
  }
})
