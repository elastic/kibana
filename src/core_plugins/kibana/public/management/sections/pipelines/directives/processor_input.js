import uiModules from 'ui/modules';
import '../styles/_processor_input.less';
import template from '../views/processor_input.html';

const app = uiModules.get('kibana');

app.directive('processorInput', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      processor: '='
    }
  };
});
