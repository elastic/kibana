import { uiModules } from 'ui/modules';
import vislibBasicOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options.html';
const module = uiModules.get('kibana');

module.directive('vislibBasicOptions', function () {
  return {
    restrict: 'E',
    template: vislibBasicOptionsTemplate,
    replace: true
  };
});
