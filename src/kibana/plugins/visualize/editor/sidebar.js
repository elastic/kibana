define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visEditorSidebar', function () {
    var _ = require('lodash');

    require('plugins/visualize/editor/agg_group');
    require('plugins/visualize/editor/vis_options');

    return {
      restrict: 'E',
      template: require('text!plugins/visualize/editor/sidebar.html'),
      scope: true,
      controllerAs: 'sidebar',
      link: function ($scope) {
        $scope.$bind('vis', 'editableVis');
        if ($scope.vis) {
          $scope.sidebar.section = $scope.vis.type.requiresSearch ? 'data' : 'options';
        }
      }
    };
  });
});
