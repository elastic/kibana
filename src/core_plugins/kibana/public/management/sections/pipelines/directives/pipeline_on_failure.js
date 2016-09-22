import uiModules from 'ui/modules';
import '../styles/_pipeline_on_failure.less';
import template from '../views/pipeline_on_failure.html';

const app = uiModules.get('kibana');

app.directive('pipelineOnFailure', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '='
    },
    controller: ($scope) => {
      $scope.collapsed = true;
    }
  };
});
