import uiModules from 'ui/modules';
import lineInterpolationOptionTemplate from 'plugins/kbn_vislib_vis_types/controls/line_interpolation_option.html';
const module = uiModules.get('kibana');

module.directive('lineInterpolationOption', function () {
  return {
    restrict: 'E',
    template: lineInterpolationOptionTemplate,
    replace: true
  };
});
