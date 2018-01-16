import { uiModules } from 'ui/modules';
import regionMapVisParamsTemplate from './region_map_vis_params.html';
import { mapToLayerWithId } from './util';
import '../../tile_map/public/editors/wms_options';

uiModules.get('kibana/region_map')
  .directive('regionMapVisParams', function (serviceSettings, regionmapsConfig, Notifier) {

    const notify = new Notifier({ location: 'Region map' });

    return {
      restrict: 'E',
      template: regionMapVisParamsTemplate,
      link: function ($scope) {

        $scope.collections = $scope.vis.type.editorConfig.collections;
        $scope.onLayerChange = onLayerChange;

        if (regionmapsConfig.includeElasticMapsService) {

          serviceSettings.getFileLayers()
            .then(function (layersFromService) {

              layersFromService = layersFromService.map(mapToLayerWithId.bind(null, 'elastic_maps_service'));
              const newVectorLayers = $scope.collections.vectorLayers.slice();
              for (let i = 0; i < layersFromService.length; i += 1) {
                const layerFromService = layersFromService[i];
                const alreadyAdded = newVectorLayers.some((layer) => layerFromService.layerId === layer.layerId);
                if (!alreadyAdded) {
                  //backfill v1 manifest for now
                  if (layerFromService.format === 'geojson') {
                    layerFromService.format = {
                      type: 'geojson'
                    };
                  }
                  newVectorLayers.push(layerFromService);
                }
              }

              $scope.collections.vectorLayers = newVectorLayers;
              if ($scope.collections.vectorLayers[0] && !$scope.vis.params.selectedLayer) {
                $scope.vis.params.selectedLayer = $scope.collections.vectorLayers[0];
                onLayerChange();
              }

              //the dirty flag is set to true because the change in vector layers config causes an update of the scope.params
              //temp work-around. addressing this issue with the visualize refactor for 6.0
              setTimeout(function () {
                $scope.dirty = false;
              }, 0);
              $scope.collections.vectorLayers = newVectorLayers;

              if ($scope.collections.vectorLayers[0] && !$scope.vis.params.selectedLayer) {
                $scope.vis.params.selectedLayer = $scope.collections.vectorLayers[0];
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
        }

        function onLayerChange() {
          $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];
        }

      }
    };
  });
