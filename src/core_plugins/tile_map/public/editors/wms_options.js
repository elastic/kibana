import { uiModules } from 'ui/modules';
import wmsOptionsTemplate from './wms_options.html';
const module = uiModules.get('kibana');

module.directive('wmsOptions', function (serviceSettings) {
  return {
    restrict: 'E',
    template: wmsOptionsTemplate,
    replace: true,
    scope: {
      options: '='
    },
    link: function ($scope) {

      $scope.options.baseLayersAreLoaded = new Promise((resolve, reject) => {

        serviceSettings
          .getTMSServices()
          .then((allTMSServices) => {

            if (!$scope.options.tmsLayers) {
              $scope.options.tmsLayers = [];
            }

            const newBaseLayers = $scope.options.tmsLayers.slice();
            for (let i = 0; i < allTMSServices.length; i += 1) {
              const layerFromService = allTMSServices[i];
              const alreadyAdded = newBaseLayers.some((layer) => layerFromService.id === layer.id);
              if (!alreadyAdded) {
                newBaseLayers.push(layerFromService);
              }
            }
            $scope.options.tmsLayers = newBaseLayers;

            if (!$scope.options.selectedTmsLayer) {
              $scope.options.selectedTmsLayer = $scope.options.tmsLayers[0];
            }
            resolve(true);

          })
          .catch(function (e) {
            reject(e);
          });


      });


    }
  };
});
