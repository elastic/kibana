import uiModules from 'ui/modules';
import '../styles/_process_container_header.less';

const app = uiModules.get('kibana');

app.directive('processContainerHeader', function () {
  return {
    restrict: 'E',
    scope: {
      processor: '=',
      field: '=',
      pipeline: '='
    },
    template: require('../views/process_container_header.html')
  };
});
