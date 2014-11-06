define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('modules')
  .get('app/visualize')
  .directive('visEditorVisOptions', function (Private, $timeout, $compile) {
    return {
      restrict: 'E',
      template: require('text!plugins/visualize/editor/vis_options.html'),
      replace: true,
      scope: {
        vis: '=',
      },
      link: function ($scope, $el) {
        var $optionContainer = $('.visualization-options');
        var $editor = $compile($scope.vis.type.params.editor)($scope);
        $optionContainer.append($editor);

        $scope.$watch('vis.type.schemas.length', function (len) {
          $scope.alwaysShowOptions = len === 0;
        });
      }
    };
  });
});