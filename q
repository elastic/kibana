[1mdiff --git a/src/core_plugins/region_map/public/region_map_controller.js b/src/core_plugins/region_map/public/region_map_controller.js[m
[1mindex 90e0e74..0245f51 100644[m
[1m--- a/src/core_plugins/region_map/public/region_map_controller.js[m
[1m+++ b/src/core_plugins/region_map/public/region_map_controller.js[m
[36m@@ -28,23 +28,6 @@[m [mmodule.controller('KbnRegionMapController', function ($scope, $element, Private,[m
   let choroplethLayer = null;[m
   const kibanaMapReady = makeKibanaMap();[m
 [m
[31m-  serviceSettings.getFileLayers()[m
[31m-    .then(function (layersFromService) {[m
[31m-      const newVectorLayers = $scope.vis.type.params.vectorLayers.slice();[m
[31m-      for (let i = 0; i < layersFromService.length; i += 1) {[m
[31m-        const layerFromService = layersFromService[i];[m
[31m-        const alreadyAdded = newVectorLayers.some((layer) =>_.eq(layerFromService, layer));[m
[31m-        if (!alreadyAdded) {[m
[31m-          newVectorLayers.push(layerFromService);[m
[31m-        }[m
[31m-      }[m
[31m-      $scope.vis.type.params.vectorLayers = newVectorLayers;[m
[31m-      $scope.$apply();[m
[31m-    })[m
[31m-    .catch(function (error) {[m
[31m-      notify.warning(error.message);[m
[31m-    });[m
[31m-[m
   $scope.$watch('esResponse', async function (response) {[m
     kibanaMapReady.then(() => {[m
       const metricsAgg = _.first($scope.vis.aggs.bySchemaName.metric);[m
[1mdiff --git a/src/core_plugins/region_map/public/region_map_vis_params.js b/src/core_plugins/region_map/public/region_map_vis_params.js[m
[1mindex 821c8a7..8d961be 100644[m
[1m--- a/src/core_plugins/region_map/public/region_map_vis_params.js[m
[1m+++ b/src/core_plugins/region_map/public/region_map_vis_params.js[m
[36m@@ -1,19 +1,54 @@[m
 import { uiModules } from 'ui/modules';[m
 import regionMapVisParamsTemplate from './region_map_vis_params.html';[m
[32m+[m[32mimport _ from 'lodash';[m
 [m
 uiModules.get('kibana/region_map')[m
[31m-  .directive('regionMapVisParams', function () {[m
[32m+[m[32m  .directive('regionMapVisParams', function (serviceSettings, Notifier) {[m
[32m+[m
[32m+[m
[32m+[m[32m    const notify = new Notifier({ location: 'Region map' });[m
[32m+[m
     return {[m
       restrict: 'E',[m
       template: regionMapVisParamsTemplate,[m
       link: function ($scope) {[m
[32m+[m
[32m+[m
[32m+[m[32m        console.log('calling the linker function...');[m
[32m+[m
         $scope.onLayerChange = onLayerChange;[m
[31m-        $scope.$watch('vis.type.params.vectorLayers', () => {[m
[31m-          if ($scope.vis.type.params.vectorLayers[0] && !$scope.vis.params.selectedLayer) {[m
[31m-            $scope.vis.params.selectedLayer = $scope.vis.type.params.vectorLayers[0];[m
[31m-            onLayerChange();[m
[31m-          }[m
[31m-        });[m
[32m+[m
[32m+[m
[32m+[m[32m        serviceSettings.getFileLayers()[m
[32m+[m[32m          .then(function (layersFromService) {[m
[32m+[m
[32m+[m[32m            const newVectorLayers = $scope.vis.type.params.vectorLayers.slice();[m
[32m+[m[32m            for (let i = 0; i < layersFromService.length; i += 1) {[m
[32m+[m[32m              const layerFromService = layersFromService[i];[m
[32m+[m[32m              const alreadyAdded = newVectorLayers.some((layer) =>_.eq(layerFromService, layer));[m
[32m+[m[32m              if (!alreadyAdded) {[m
[32m+[m[32m                newVectorLayers.push(layerFromService);[m
[32m+[m[32m              }[m
[32m+[m[32m            }[m
[32m+[m
[32m+[m[32m            $scope.vis.type.params.vectorLayers = newVectorLayers;[m
[32m+[m
[32m+[m[32m            if ($scope.vis.type.params.vectorLayers[0] && !$scope.vis.params.selectedLayer) {[m
[32m+[m[32m              $scope.vis.params.selectedLayer = $scope.vis.type.params.vectorLayers[0];[m
[32m+[m[32m              onLayerChange();[m
[32m+[m[32m            }[m
[32m+[m
[32m+[m
[32m+[m[32m            //the dirty flag is set to true because the change in vector layers config causes an update of the scope.params[m
[32m+[m[32m            //temp work-around. addressing this issue with the visualize refactor for 6.0[m
[32m+[m[32m            setTimeout(function () {[m
[32m+[m[32m              $scope.dirty = false;[m
[32m+[m[32m            }, 0);[m
[32m+[m
[32m+[m[32m          })[m
[32m+[m[32m          .catch(function (error) {[m
[32m+[m[32m            notify.warning(error.message);[m
[32m+[m[32m          });[m
 [m
         function onLayerChange() {[m
           $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];[m
