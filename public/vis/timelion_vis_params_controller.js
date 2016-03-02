define(function (require) {
  require('plugins/timelion/directives/expression_directive');

  var module = require('ui/modules').get('kibana/timelion_vis', ['kibana']);
  module.controller('TimelionVisParamsController', function ($scope, $rootScope) {
    $scope.vis.params.expression = $scope.vis.params.expression || '.es(*)';

    $scope.search = function () {
      $rootScope.$broadcast('courier:searchRefresh');
    };
  });
});
