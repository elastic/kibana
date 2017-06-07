define(function (require) {
  require('plugins/timelion/directives/chart/chart');
  require('plugins/timelion/directives/timelion_interval/timelion_interval');
  require('ui/state_management/app_state');

  const module = require('ui/modules').get('kibana/timelion_vis', ['kibana']);
  module.controller('TimelionVisController', function ($scope) {

    $scope.$on('renderComplete', event => {
      event.stopPropagation();
      $scope.renderComplete();
    });
  });
});
