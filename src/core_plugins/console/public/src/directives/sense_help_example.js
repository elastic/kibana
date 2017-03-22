import SenseEditor from '../sense_editor/editor';
const exampleText = require('raw!./helpExample.txt').trim();
import { useResizeCheckerProvider } from '../sense_editor_resize';

require('ui/modules')
.get('app/sense')
.directive('senseHelpExample', function (Private) {
  const useResizeChecker = Private(useResizeCheckerProvider);

  return {
    restrict: 'E',
    link: function ($scope, $el) {
      $el.text(exampleText);
      $scope.editor = new SenseEditor($el);
      useResizeChecker($scope, $el, $scope.editor);
      $scope.editor.setReadOnly(true);
      $scope.editor.$blockScrolling = Infinity;

      $scope.$on('$destroy', function () {
        if ($scope.editor) $scope.editor.destroy();
      });
    }
  }
})
