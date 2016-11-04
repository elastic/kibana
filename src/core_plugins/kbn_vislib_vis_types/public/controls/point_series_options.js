import 'ui/directives/inequality';
import uiModules from 'ui/modules';
import pointSeriesOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series_options.html';
const module = uiModules.get('kibana');

module.directive('pointSeriesOptions', function () {
  return {
    restrict: 'E',
    template: pointSeriesOptionsTemplate,
    replace: true
  };
});
