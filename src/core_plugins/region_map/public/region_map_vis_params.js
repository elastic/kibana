import { uiModules } from 'ui/modules';
import regionMapVisParamsTemplate from './region_map_vis_params.html';
import _ from 'lodash';

uiModules.get('kibana/region_map')
  .directive('regionMapVisParams', function (serviceSettings, Notifier) {


    const notify = new Notifier({ location: 'Region map' });

    return {
      restrict: 'E',
      template: regionMapVisParamsTemplate,
      link: function ($scope) {

        $scope.onLayerChange = onLayerChange;
        serviceSettings.getFileLayers()
          .then(function (layersFromService) {

            const newVectorLayers = $scope.vis.type.params.vectorLayers.slice();
            for (let i = 0; i < layersFromService.length; i += 1) {
              const layerFromService = layersFromService[i];
              const alreadyAdded = newVectorLayers.some((layer) =>_.eq(layerFromService, layer));
              if (!alreadyAdded) {
                newVectorLayers.push(layerFromService);
              }
            }

            $scope.vis.type.params.vectorLayers = newVectorLayers;

            if ($scope.vis.type.params.vectorLayers[0] && !$scope.vis.params.selectedLayer) {
              $scope.vis.params.selectedLayer = $scope.vis.type.params.vectorLayers[0];
              onLayerChange();
            }


            //the dirty flag is set to true because the change in vector layers config causes an update of the scope.params
            //temp work-around. addressing this issue with the visualize refactor for 6.0
            setTimeout(function () {
              $scope.dirty = false;
            }, 0);

          })
          .catch(function (error) {
            notify.warning(error.message);
          });

        function onLayerChange() {
          $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];
        }

      }
    };
  });
