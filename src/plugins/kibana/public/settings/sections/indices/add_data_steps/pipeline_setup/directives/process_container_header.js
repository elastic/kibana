import uiModules from 'ui/modules';

require('../styles/_process_container_header.less');

const module = uiModules.get('kibana');

module.directive('processContainerHeader', function () {
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
