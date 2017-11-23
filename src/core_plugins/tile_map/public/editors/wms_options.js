import { uiModules } from 'ui/modules';
import wmsOptionsTemplate from './wms_options.html';
const module = uiModules.get('kibana');

module.directive('wmsOptions', function () {
  return {
    restrict: 'E',
    template: wmsOptionsTemplate,
    replace: true,
  };
});
