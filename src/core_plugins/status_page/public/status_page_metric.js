import _ from 'lodash';
import moment from 'moment';
import numeral from 'numeral';

import formatNumber from './lib/format_number';
import readStatData from './lib/read_stat_data';
import uiModules from 'ui/modules';
import statusPageMetricTemplate from 'plugins/status_page/status_page_metric.html';

uiModules
.get('kibana', [])
.filter('statusMetric', function () {
  return function (input, type) {
    const metrics = [].concat(input);
    return metrics.map(function (metric) {
      return formatNumber(metric, type);
    }).join(', ');
  };
})
.directive('statusPageMetric', function () {
  return {
    restrict: 'E',
    template: statusPageMetricTemplate,
    scope: {
      metric: '=',
    },
    controllerAs: 'metric'
  };
});
