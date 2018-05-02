import 'ui/directives/inequality';
import { uiModules } from 'ui/modules';
import pointSeriesOptionsTemplate from './point_series_options.html';
const module = uiModules.get('kibana');

module.directive('pointSeriesOptions', function () {
  return {
    restrict: 'E',
    template: pointSeriesOptionsTemplate,
    replace: true
  };
});
