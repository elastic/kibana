import uiModules from 'ui/modules';
import '../styles/_pipeline_output.less';
import pipelineOutputTemplate from '../views/pipeline_output.html';

const app = uiModules.get('kibana');

app.directive('pipelineOutput', function () {
  return {
    restrict: 'E',
    template: pipelineOutputTemplate,
    scope: {
      pipeline: '=',
      samples: '=',
      sample: '='
    },
    controller: function ($scope) {
      $scope.collapsed = true;
    }
  };
});
