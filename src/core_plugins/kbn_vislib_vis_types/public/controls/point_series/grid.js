import uiModules from 'ui/modules';
import vislibGridTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series/grid.html';
const module = uiModules.get('kibana');

module.directive('vislibGrid', function () {
  return {
    restrict: 'E',
    template: vislibGridTemplate,
    replace: true,
    link: function ($scope) {

      $scope.isGridOpen = true;
    }
  };
});
