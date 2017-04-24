import { uiModules } from 'ui/modules';
import visOptionsTemplate from 'plugins/kibana/visualize/editor/vis_options.html';

/**
 * This directive sort of "transcludes" in whatever template you pass in via the `editor` attribute.
 * This lets you specify a full-screen UI for editing a vis type, instead of using the regular
 * sidebar.
 */

uiModules
.get('app/visualize')
.directive('visEditorVisOptions', function (Private, $timeout, $compile) {
  return {
    restrict: 'E',
    template: visOptionsTemplate,
    scope: {
      vis: '=',
      savedVis: '=',
      uiState: '=',
      editor: '=',
      stageEditableVis: '='
    },
    link: function ($scope, $el) {
      const $optionContainer = $el.find('[data-visualization-options]');

      // Bind the `editor` template with the scope.
      const $editor = $compile($scope.editor)($scope);
      $optionContainer.append($editor);

      $scope.$watch('vis.type.schemas.all.length', function (len) {
        $scope.alwaysShowOptions = len === 0;
      });
    }
  };
});
