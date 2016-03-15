import uiModules from 'ui/modules';
import '../styles/_processor_ui_container_header.less';

const app = uiModules.get('kibana');

app.directive('processorUiContainerHeader', function () {
  return {
    restrict: 'E',
    scope: {
      processor: '=',
      field: '=',
      pipeline: '='
    },
    template: require('../views/processor_ui_container_header.html')
  };
});
