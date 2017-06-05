import 'plugins/kibana/visualize/editor/agg_group';
import 'plugins/kibana/visualize/editor/vis_options';
import { uiModules } from 'ui/modules';
import sidebarTemplate from 'plugins/kibana/visualize/editor/sidebar.html';
uiModules
.get('app/visualize')
.directive('visEditorSidebar', function () {


  return {
    restrict: 'E',
    template: sidebarTemplate,
    scope: true,
    controllerAs: 'sidebar',
    controller: function ($scope) {
      $scope.$bind('vis', 'editableVis');

      $scope.$watch('vis.type', (visType) => {
        if (visType) {
          this.showData = visType.schemas.buckets || visType.schemas.metrics;
          this.section = this.section || (this.showData ? 'data' : 'options');
        }
      });
    }
  };
});
