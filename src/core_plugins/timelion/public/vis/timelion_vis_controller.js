
import '../directives/chart/chart';
import '../directives/timelion_interval/timelion_interval';
import 'ui/state_management/app_state';

import { uiModules } from 'ui/modules';

uiModules
  .get('kibana/timelion_vis', ['kibana'])
  .controller('TimelionVisController', function ($scope) {
    $scope.$on('timelionChartRendered', event => {
      event.stopPropagation();
      $scope.renderComplete();
    });
  });
