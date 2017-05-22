import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana/waffle_chart', ['kibana']);

module.controller('KbnWaffleChartController', function ($scope, $element, Private) {
  $scope.$watch('esResponse', function (resp) {
    if (resp) {
      // call when done rendering
      $scope.renderComplete();
    }
  });
});
