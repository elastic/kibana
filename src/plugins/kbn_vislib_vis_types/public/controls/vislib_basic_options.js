import _ from 'lodash';
import $ from 'jquery';
import uiModules from 'ui/modules';
import vislibBasicOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options.html';
const module = uiModules.get('kibana');

module.directive('vislibBasicOptions', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: vislibBasicOptionsTemplate,
    replace: true
  };
});
