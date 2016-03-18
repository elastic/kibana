import uiModules from 'ui/modules';
import '../styles/_pipeline_output.less';

const app = uiModules.get('kibana');

app.directive('pipelineOutput', function () {
  return {
    restrict: 'E',
    template: require('../views/pipeline_output.html'),
    scope: {
      pipeline: '='
    },
    controller: function ($scope) {
      $scope.collapsed = true;
    }
  };
});
