var _ = require('lodash');
var moment = require('moment');
var numeral = require('numeral');
require('angular-nvd3');

var toTitleCase = require('./lib/toTitleCase');
var formatNumber = require('./lib/formatNumber');
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

        var unit = '';
        self.averages = self.averages.map(function (average) {
          var parts = average.split(' ');
          var value = parts.shift();
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
