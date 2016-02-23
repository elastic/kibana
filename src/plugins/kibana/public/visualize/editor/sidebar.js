define(function (require) {
  require('ui/modules')
  .get('app/visualize')
  .directive('visEditorSidebar', function () {
    const _ = require('lodash');

    require('plugins/kibana/visualize/editor/agg_group');
    require('plugins/kibana/visualize/editor/vis_options');

    return {
      restrict: 'E',
      template: require('plugins/kibana/visualize/editor/sidebar.html'),
      scope: true,
      controllerAs: 'sidebar',
      controller: function ($scope) {
        $scope.$bind('vis', 'editableVis');
        $scope.$bind('outputVis', 'vis');
        $scope.$watch('vis.type', (visType) => {
          if (visType) {
            this.showData = visType.schemas.buckets || visType.schemas.metrics;
            this.section = this.section || (this.showData ? 'data' : 'options');
          }
        });
      }
    };
  });
});
