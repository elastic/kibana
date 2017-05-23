import { uiModules } from 'ui/modules';
import regionMapVisParamsTemplate from './region_map_vis_params.html';

uiModules.get('kibana/region_map')
  .directive('regionMapVisParams', function () {
    return {
      restrict: 'E',
      template: regionMapVisParamsTemplate,
      link: function ($scope) {
        $scope.onLayerChange = onLayerChange;
        $scope.$watch('vis.type.params.vectorLayers', () => {
          if ($scope.vis.type.params.vectorLayers[0] && !$scope.vis.params.selectedLayer) {
            $scope.vis.params.selectedLayer = $scope.vis.type.params.vectorLayers[0];
            onLayerChange();
          }
        });

        function onLayerChange() {
          $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];
        }

      }
    };
  });
