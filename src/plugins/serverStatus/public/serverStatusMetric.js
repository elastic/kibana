var _ = require('lodash');
var moment = require('moment');
var numeral = require('numeral');
require('angular-nvd3');

var toTitleCase = require('./lib/toTitleCase');
var formatNumber = require('./lib/formatNumber');
var getChartOptions = _.memoize(require('./lib/makeChartOptions'));
var readStatData = require('./lib/readStatData');

function metricToNumberType(stat) {
  switch (stat) {
  case 'heapTotal':
  case 'heapUsed':
  case 'rss':
    return 'byte';
  case 'delay':
  case 'responseTimeAvg':
  case 'responseTimeMax':
    return 'ms';
  default:
    return 'precise';
  }
}

function calcAvg(metricList, metricNumberType) {
  return metricList.map(function (data) {
    var uglySum = data.values.reduce(function (sumSoFar, vector) {
      return sumSoFar + vector.y;
    }, 0);
    return formatNumber(uglySum / data.values.length, metricNumberType);
  });
}

require('modules')
.get('kibana', ['nvd3'])
.directive('serverStatusMetric', function () {
  return {
    restrict: 'E',
    template: require('plugins/serverStatus/serverStatusMetric.html'),
    link: function ($scope, $el, attrs) {
      var metricNumberType = metricToNumberType($scope.name);

      $scope.chart = {
        niceName: toTitleCase($scope.name),
        options: getChartOptions(metricNumberType)
      };

      $scope.seriesNames = $scope.name === 'load' ? ['1min', '5min', '15min'] : null;

      $scope.$watch('data', function () {
        $scope.chart.data = readStatData($scope.data, $scope.seriesNames);
        $scope.chart.average = calcAvg($scope.chart.data, metricNumberType);
      });
    }
  };
});
