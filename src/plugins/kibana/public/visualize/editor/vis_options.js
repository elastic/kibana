define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('ui/modules')
  .get('app/visualize')
  .directive('visEditorVisOptions', function (Private, $timeout, $compile) {
    return {
      restrict: 'E',
      template: require('plugins/kibana/visualize/editor/vis_options.html'),
      scope: {
        vis: '=',
      },
      link: function ($scope, $el) {
        var $optionContainer = $('.visualization-options');
        var $editor = $compile($scope.vis.type.params.editor)($scope);
        $optionContainer.append($editor);

        $scope.$watch('vis.type.schemas.all.length', function (len) {
          $scope.alwaysShowOptions = len === 0;
        });
      }
    };
  });
});
