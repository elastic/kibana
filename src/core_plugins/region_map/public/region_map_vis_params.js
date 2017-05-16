import { uiModules } from 'ui/modules';
import regionMapVisParamsTemplate from 'plugins/region_map/region_map_vis_params.html';

uiModules.get('kibana/region_map')
  .directive('regionMapVisParams', function () {
    return {
      restrict: 'E',
      template: regionMapVisParamsTemplate,
      link: function ($scope) {

        $scope.onLayerChange = function () {
          $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];
        };

      }
    };
  });
