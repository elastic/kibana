define(function (require) {
  require('flot.time');
  var _ = require('lodash');
  var $ = require('jquery');
  return function ($window) {
    return {
      restrict: 'A',
      scope: {
        chart: '=',
        cell: '='
      },
      link: function ($scope, $elem) {
        $elem.prepend('<span>lol</span>');

        var options = {
          xaxis: {
            mode: 'time',
            tickLength: 0,
            color: '#eee'
          },
          grid: {
            backgroundColor: '#fff',
            borderWidth: 0,
            borderColor: null,
            margin: 10,
          },
          legend: {
            position: 'nw'
          },
          yaxes: [ { }, { position: "right", min: 20 } ],
          colors: ['#01A4A4', '#D0D102', '#E54028', '#616161', '#00A1CB','#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060']
        };

        $scope.$watch('chart', function (val) {

          if (!val || !val.length) {
            $elem.empty();
            return;
          }

          var series = _.map($scope.chart, function (series, i) {
            series.label = series.label || '';
            series.label = (i + 1) + (series.label ? ': ' + series.label : '');
            if (series.yaxis === 2) {
              series.label = series.label + ' (right)';
            }
            return _.defaults(series, {
              shadowSize: 0,
              lines: {
                lineWidth: 6
              }
            });
          });

          $.plot($elem, series, options);
        });
      }
    };
  };

});