import _ from 'lodash';
import $ from 'jquery';
import uiModules from 'ui/modules';
import lineInterpolationOptionTemplate from 'plugins/kbn_vislib_vis_types/controls/line_interpolation_option.html';
const module = uiModules.get('kibana');

module.directive('lineInterpolationOption', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: lineInterpolationOptionTemplate,
    replace: true
  };
});
