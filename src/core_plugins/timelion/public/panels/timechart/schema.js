require('./flot');
require('plugins/timelion/panels/timechart/timechart.less');
const _ = require('lodash');
const $ = require('jquery');
const moment = require('moment-timezone');
const observeResize = require('plugins/timelion/lib/observe_resize');
const calculateInterval = require('plugins/timelion/lib/calculate_interval');

const SET_LEGEND_NUMBERS_DELAY = 50;

module.exports = function timechartFn(Private, config, $rootScope, timefilter, $compile) {
  return function () {
    return {
      help: 'Draw a timeseries chart',
      render: function ($scope, $elem) {
        const template = '<div class="chart-top-title"></div><div class="chart-canvas"></div>';
        const timezone = Private(require('plugins/timelion/services/timezone'))();
        const getxAxisFormatter = Private(require('plugins/timelion/panels/timechart/xaxis_formatter'));

        // TODO: I wonder if we should supply our own moment that sets this every time?
        // could just use angular's injection to provide a moment service?
        moment.tz.setDefault(config.get('dateFormat:tz'));

        const render = $scope.seriesList.render || {};

        $scope.chart = $scope.seriesList.list;
        $scope.interval = $scope.interval;
        $scope.search = $scope.search || _.noop;

        let legendValueNumbers;
        const debouncedSetLegendNumbers = _.debounce(setLegendNumbers, SET_LEGEND_NUMBERS_DELAY, {
          maxWait: SET_LEGEND_NUMBERS_DELAY,
          leading: true,
          trailing: false
        });

        const defaultOptions = {
          xaxis: {
            mode: 'time',
            tickLength: 5,
            timezone: 'browser',
          },
          selection: {
            mode: 'x',
            color: '#ccc'
          },
          crosshair: {
            mode: 'x',
            color: '#C66',
            lineWidth: 2
          },
          grid: {
            show: render.grid,
            borderWidth: 0,
            borderColor: null,
            margin: 10,
            hoverable: true,
            autoHighlight: false
          },
          legend: {
            backgroundColor: null,
            position: 'nw',
            labelBoxBorderColor: 'rgb(255,255,255,0)',
            labelFormatter: function (label, series) {
              return '<span class="ngLegendValue" ng-click="toggleSeries(' + series._id + ')">' +
                label +
                '<span class="ngLegendValueNumber"></span></span>';
            }
          },
          colors: ['#01A4A4', '#C66', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060']
        };


        $scope.toggleSeries = function (id) {
          const series = $scope.chart[id];
          series._hide = !series._hide;
          drawPlot($scope.chart);
        };

        const cancelResize = observeResize($elem, function () {
          drawPlot($scope.chart);
        });

        $scope.$on('$destroy', function () {
          cancelResize();
          $elem.off('plothover');
          $elem.off('plotselected');
          $elem.off('mouseleave');
        });

        $elem.on('plothover',  function (event, pos, item) {
          $rootScope.$broadcast('timelionPlotHover', event, pos, item);
        });

        $elem.on('plotselected', function (event, ranges) {
          timefilter.time.from = moment(ranges.xaxis.from);
          timefilter.time.to = moment(ranges.xaxis.to);
          timefilter.time.mode = 'absolute';
          $scope.search();
        });

        $elem.on('mouseleave', function () {
          $rootScope.$broadcast('timelionPlotLeave');
        });

        $scope.$on('timelionPlotHover', function (angularEvent, flotEvent, pos, time) {
          if (!$scope.plot) return;
          $scope.plot.setCrosshair(pos);
          debouncedSetLegendNumbers(pos);
        });

        $scope.$on('timelionPlotLeave', function (angularEvent, flotEvent, pos, time) {
          if (!$scope.plot) return;
          $scope.plot.clearCrosshair();
          clearLegendNumbers();
        });

        // Shamelessly borrowed from the flotCrosshairs example
        function setLegendNumbers(pos) {
          const plot = $scope.plot;

          const axes = plot.getAxes();
          if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max) {
            return;
          }

          let i;
          let j;
          const dataset = plot.getData();
          for (i = 0; i < dataset.length; ++i) {

            const series = dataset[i];
            const precision = _.get(series, '_meta.precision', 2);

            if (series._hide) continue;

            // Nearest point
            for (j = 0; j < series.data.length; ++j) {
              if (series.data[j][0] > pos.x) break;
            }

            let y;
            try {
              y = series.data[j][1];
            } catch (e) {
              y = null;
            }

            if (y != null) {
              legendValueNumbers.eq(i).text('(' + y.toFixed(precision) + ')');
            } else {
              legendValueNumbers.eq(i).empty();
            }
          }
        }

        function clearLegendNumbers() {
          _.each(legendValueNumbers, function (num) {
            $(num).empty();
          });
        }

        let legendScope = $scope.$new();
        function drawPlot(plotConfig) {

          if (!plotConfig || !plotConfig.length) {
            $elem.empty();
            return;
          }

          if (!$('.chart-canvas', $elem).length) $elem.html(template);
          const canvasElem = $('.chart-canvas', $elem);

          const title = _(plotConfig).map('_title').compact().last();
          $('.chart-top-title', $elem).text(title == null ? '' : title);

          const options = _.cloneDeep(defaultOptions);

          // Get the X-axis tick format
          const time = timefilter.getBounds();
          const interval = calculateInterval(
            time.min.valueOf(),
            time.max.valueOf(),
            config.get('timelion:target_buckets') || 200,
            $scope.interval
          );
          const format = getxAxisFormatter(interval);

          // Use moment to format ticks so we get timezone correction
          options.xaxis.tickFormatter = function (val) {
            return moment(val).format(format);
          };

          // Calculate how many ticks can fit on the axis
          const tickLetterWidth = 7;
          const tickPadding = 45;
          options.xaxis.ticks = Math.floor($elem.width() / ((format.length * tickLetterWidth) + tickPadding));

          const series = _.map(plotConfig, function (series, index) {
            series = _.cloneDeep(_.defaults(series, {
              shadowSize: 0,
              lines: {
                lineWidth: 3
              }
            }));
            series._id = index;

            if (series._hide) {
              series.data = [];
              series.stack = false;
              //series.color = "#ddd";
              series.label = '(hidden) ' + series.label;
            }

            if (series._global) {
              _.merge(options, series._global, function (objVal, srcVal) {
                // This is kind of gross, it means that you can't replace a global value with a null
                // best you can do is an empty string. Deal with it.
                if (objVal == null) return srcVal;
                if (srcVal == null) return objVal;
              });
            }

            return series;
          });

          try {
            $scope.plot = $.plot(canvasElem, _.compact(series), options);
          } catch (e) {
            setTimeout(drawPlot, 500);
          }

          if ($scope.plot) {
            $scope.$emit('renderComplete');
          }

          legendScope.$destroy();
          legendScope = $scope.$new();
          // Used to toggle the series, and for displaying values on hover
          legendValueNumbers = canvasElem.find('.ngLegendValueNumber');
          _.each(canvasElem.find('.ngLegendValue'), function (elem) {
            $compile(elem)(legendScope);
          });
        }
        $scope.$watch('chart', drawPlot);
      }
    };
  };
};
