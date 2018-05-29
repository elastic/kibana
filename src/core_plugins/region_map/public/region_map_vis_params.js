/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
