import _ from 'lodash';
import uiModules from 'ui/modules';
import vislibGridTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series/grid.html';
const module = uiModules.get('kibana');

module.directive('vislibGrid', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: vislibGridTemplate,
    replace: true,
    link: function ($scope) {
      function mapPosition(position) {
        switch (position) {
          case 'bottom': return 'left';
          case 'top': return 'right';
          case 'left': return 'bottom';
          case 'right': return 'top';
        }
      }

      $scope.isGridOpen = true;

      $scope.$watch('vis.params.categoryAxes[0].position', position => {
        const categoryAxisIsHorizontal = ['top', 'bottom'].includes(position);
        $scope.vis.params.valueAxes.forEach(axis => {
          const axisIsHorizontal = ['top', 'bottom'].includes(axis.position);
          if (axisIsHorizontal === categoryAxisIsHorizontal) {
            axis.position = mapPosition(axis.position);
          }
        });
      });
    }
  };
});
