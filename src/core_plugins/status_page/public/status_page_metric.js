import _ from 'lodash';
import moment from 'moment';
import numeral from 'numeral';

import toTitleCase from './lib/to_title_case';
import formatNumber from './lib/format_number';
import readStatData from './lib/read_stat_data';
import uiModules from 'ui/modules';
import statusPageMetricTemplate from 'plugins/status_page/status_page_metric.html';

function calcAvg(metricList, metricNumberType) {
  return metricList.map(function (data) {
    const uglySum = data.values.reduce(function (sumSoFar, vector) {
      return sumSoFar + vector.y;
    }, 0);
    return formatNumber(uglySum / data.values.length, metricNumberType);
  });
}

uiModules
.get('kibana', [])
.directive('statusPageMetric', function () {
  return {
    restrict: 'E',
    template: statusPageMetricTemplate,
    scope: {
      name: '@',
      data: '='
    },
    controllerAs: 'metric',
    controller: function ($scope) {
      const self = this;

      self.name = $scope.name;
      self.title = toTitleCase(self.name);
      self.extendedTitle = self.title;
      self.numberType = 'precise';
      self.seriesNames = [];

      switch (self.name) {
        case 'heapTotal':
        case 'heapUsed':
          self.numberType = 'byte';
          break;

        case 'responseTimeAvg':
        case 'responseTimeMax':
          self.numberType = 'ms';
          break;

        case 'load':
          self.seriesNames = ['1min', '5min', '15min'];
          break;
      }

      $scope.$watch('data', function (data) {
        self.rawData = data;
        self.chartData = readStatData(self.rawData, self.seriesNames);
        self.averages = calcAvg(self.chartData, self.numberType);

        let unit = '';
        self.averages = self.averages.map(function (average) {
          const parts = average.split(' ');
          const value = parts.shift();
          unit = parts.join(' ');
          return value;
        });
        self.extendedTitle = self.title;
        if (unit) {
          self.extendedTitle = `${self.extendedTitle} (${unit})`;
        }
      });
    }
  };
});
