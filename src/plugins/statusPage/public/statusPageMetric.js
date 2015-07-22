var _ = require('lodash');
var moment = require('moment');
var numeral = require('numeral');
require('angular-nvd3');

var toTitleCase = require('./lib/toTitleCase');
var formatNumber = require('./lib/formatNumber');
var getChartOptions = _.memoize(require('./lib/makeChartOptions'));
var readStatData = require('./lib/readStatData');

function calcAvg(metricList, metricNumberType) {
  return metricList.map(function (data) {
    var uglySum = data.values.reduce(function (sumSoFar, vector) {
      return sumSoFar + vector.y;
    }, 0);
    return formatNumber(uglySum / data.values.length, metricNumberType);
  });
}

require('ui/modules')
.get('kibana', ['nvd3'])
.directive('statusPageMetric', function () {
  return {
    restrict: 'E',
    template: require('plugins/statusPage/statusPageMetric.html'),
    scope: {
      name: '@',
      data: '='
    },
    controllerAs: 'metric',
    controller: function ($scope) {
      var self = this;

      self.name = $scope.name;
      self.title = toTitleCase(self.name);
      self.numberType = 'precise';
      self.seriesNames = [];

      switch (self.name) {
        case 'heapTotal':
        case 'heapUsed':
        case 'rss':
          self.numberType = 'byte';
          break;

        case 'delay':
        case 'responseTimeAvg':
        case 'responseTimeMax':
          self.numberType = 'ms';
          break;

        case 'load':
          self.seriesNames = ['1min', '5min', '15min'];
          break;
      }

      self.chartOptions = getChartOptions(self.numberType);

      $scope.$watch('data', function (data) {
        self.rawData = data;
        self.chartData = readStatData(self.rawData, self.seriesNames);
        self.averages = calcAvg(self.chartData, self.numberType);
      });
    }
  };
});
