var _ = require('lodash');
var $ = require('jquery');

require('flot');
require('flotTime');

var app = require('ui/modules').get('apps/timelion', []);

app.directive('chart', function ($compile) {
  return {
    restrict: 'A',
    scope: {
      chart: '=',
      cell: '='
    },
    link: function ($scope, $elem) {
      console.log('loaded chart');
      var defaultOptions = {
        xaxis: {
          mode: 'time',
          tickLength: 0,
          color: '#ee0'
        },
        grid: {
          backgroundColor: '#fff',
          borderWidth: 0,
          borderColor: null,
          margin: 10,
        },
        legend: {
          position: 'nw',
          labelBoxBorderColor: 'rgb(255,255,255,0)',
          labelFormatter: function (label, series) {
            return '<span class="ngLegendValue" ng-click="toggleSeries(' + series._id + ')">' + label + '</span>';
          }
        },
        yaxes: [ {}, { position: 'right' } ],
        colors: ['#01A4A4', '#c66', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060']
      };

      $scope.toggleSeries = function (id) {
        var series = $scope.chart[id];
        series._hide = !series._hide;
        drawPlot($scope.chart);
      };

      function drawPlot(plotConfig) {
        if (!plotConfig || !plotConfig.length) {
          $elem.empty();
          return;
        }

        var options = _.cloneDeep(defaultOptions);
        var series = _.map($scope.chart, function (series, index) {
          series = _.cloneDeep(_.defaults(series, {
            shadowSize: 0,
            lines: {
              lineWidth: 3
            }
          }));
          series._id = index;
          if (series._hide) {
            series.data = [];
            //series.color = "#ddd";
            series.label = '(hidden) ' + series.label;
          }
          if (series._global) {
            _.merge(options, series._global);
          }

          return series;
        });

        $scope.plot = $.plot($elem, _.compact(series), options);

        _.each($elem.find('.ngLegendValue'), function (elem) {
          $compile(elem)($scope);
        });
      }

      $scope.$watch('chart', drawPlot);
    }
  };
});