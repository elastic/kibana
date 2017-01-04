import uiModules from 'ui/modules';
import '../styles/_pipeline_details.less';
import template from '../views/pipeline_details.html';

const app = uiModules.get('kibana');

app.directive('pipelineDetails', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '='
    }
  };
});
