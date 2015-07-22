define(function (require) {
  require('flot.time');
  var _ = require('lodash');
  var $ = require('jquery');
  return function () {
    return {
      restrict: 'A',
      scope: {
        chart: '=',
        cell: '='
      },
      link: function ($scope, $elem) {
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
          yaxes: [ { }, { position: "right" } ],
          colors: ['#01A4A4', '#c66', '#D0D102', '#616161', '#00A1CB','#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060']
        };

        $scope.$watch('chart', function (val) {

          if (!val || !val.length) {
            $elem.empty();
            return;
          }

          var series = _.map($scope.chart, function (series) {
            if (series.yaxis === 2) {
              series.label = series.label + ' (y2)';
            }
            return _.defaults(series, {
              shadowSize: 0,
              lines: {
                lineWidth: 5
              }
            });
          });

          $.plot($elem, series, options);
        });
      }
    };
  };

});