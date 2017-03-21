import uiModules from 'ui/modules';
import choroplethVisParamsTemplate from 'plugins/choropleth/choropleth_vis_params.html';

uiModules.get('kibana/choropleth')
  .directive('choroplethVisParams', function () {
    return {
      restrict: 'E',
      template: choroplethVisParamsTemplate,
      link: function ($scope, $element) {

        $scope.onLayerChange = function () {
          $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];
        };

      }
    };
  });
