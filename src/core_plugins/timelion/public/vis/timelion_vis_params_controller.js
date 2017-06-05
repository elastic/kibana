define(function (require) {
  require('plugins/timelion/directives/timelion_expression_input');

  const module = require('ui/modules').get('kibana/timelion_vis', ['kibana']);
  module.controller('TimelionVisParamsController', function ($scope, $rootScope) {
    $scope.vis.params.expression = $scope.vis.params.expression || '.es(*)';
    $scope.vis.params.interval = $scope.vis.params.interval || '1m';


    $scope.search = function () {
      $rootScope.$broadcast('courier:searchRefresh');
    };
  });
});
