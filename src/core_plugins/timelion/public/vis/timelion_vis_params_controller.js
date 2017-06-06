import { uiModules } from 'ui/modules';
import 'plugins/timelion/directives/timelion_expression_input';

const module = uiModules.get('kibana/timelion_vis', ['kibana']);
module.controller('TimelionVisParamsController', function ($scope, $rootScope) {
  $scope.vis.params.expression = $scope.vis.params.expression || '.es(*)';
  $scope.vis.params.interval = $scope.vis.params.interval || '1m';

  $scope.search = function () {
    $rootScope.$broadcast('courier:searchRefresh');
  };
});
