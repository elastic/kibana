import uiModules from 'ui/modules';
import template from '../views/pipeline_inputs.html';
import modes from '../lib/constants/pipeline_modes';
import './pipeline_inputs_menu';
import './pipeline_inputs_json';
import './pipeline_inputs_logs';

const app = uiModules.get('kibana');

app.directive('pipelineInputs', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '=',
      mode: '='
    },
    controller: ($scope) => {
      $scope.modes = modes;
    }
  };
});
