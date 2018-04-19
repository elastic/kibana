import formatNumber from './lib/format_number';
import { uiModules } from 'ui/modules';
import statusPageMetricTemplate from './status_page_metric.html';

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
