
import 'plugins/timelion/directives/chart/chart';
import 'plugins/timelion/directives/timelion_interval/timelion_interval';
import 'ui/state_management/app_state';

import { uiModules } from 'ui/modules';

uiModules
  .get('kibana/timelion_vis', ['kibana'])
  .controller('TimelionVisController', function ($scope) {
    $scope.$on('renderComplete', event => {
      event.stopPropagation();
      $scope.renderComplete();
    });
  });
