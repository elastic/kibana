import { uiModules } from 'ui/modules';
import { TooltipOptions } from './tooltip_options';
import vislibBasicOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options.html';
const module = uiModules.get('kibana', ['react']);

module.directive('vislibBasicOptions', function () {
  return {
    restrict: 'E',
    template: vislibBasicOptionsTemplate,
    replace: true
  };
});

module.directive('tooltipOptions', function (reactDirective) {
  return reactDirective(TooltipOptions);
});

