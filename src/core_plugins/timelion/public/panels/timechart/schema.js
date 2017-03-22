require('./flot');
require('plugins/timelion/panels/timechart/timechart.less');
import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment-timezone';
import observeResize from 'plugins/timelion/lib/observe_resize';
import calculateInterval from 'plugins/timelion/lib/calculate_interval';

const SET_LEGEND_NUMBERS_DELAY = 50;

module.exports = function timechartFn(Private, config, $rootScope, timefilter, $compile) {
  return function () {
    return {
      help: 'Draw a timeseries chart',
      render: function ($scope, $elem) {
        const template = '<div class="chart-top-title"></div><div class="chart-canvas"></div>';
        const tickFormatters = require('plugins/timelion/services/tick_formatters')();
        const getxAxisFormatter = Private(require('plugins/timelion/panels/timechart/xaxis_formatter'));
        const generateTicks = Private(require('plugins/timelion/panels/timechart/tick_generator'));

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

        $scope.$on('timelionPlotHover', function (angularEvent, flotEvent, pos) {
          if (!$scope.plot) return;
          $scope.plot.setCrosshair(pos);
          debouncedSetLegendNumbers(pos);
        });

        $scope.$on('timelionPlotLeave', function () {
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
              let label = y.toFixed(precision);
              if (series.yaxis.tickFormatter) {
                label = series.yaxis.tickFormatter(label, series.yaxis);
              }
              legendValueNumbers.eq(i).text(`(${label})`);
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
          if (!$('.chart-canvas', $elem).length) $elem.html(template);
          const canvasElem = $('.chart-canvas', $elem);

          // we can't use `$.plot` to draw the chart when the height or width is 0
          // so, we'll need another event to trigger drawPlot to actually draw it
          if (canvasElem.height() === 0 || canvasElem.width() === 0) {
            return;
          }

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

          if (options.yaxes) {
            options.yaxes.forEach(yaxis => {
              if (yaxis && yaxis.units) {
                yaxis.tickFormatter = tickFormatters[yaxis.units.type];
                const byteModes = ['bytes', 'bytes/s'];
                if (byteModes.includes(yaxis.units.type)) {
                  yaxis.tickGenerator = generateTicks;
                }
              }
            });
          }

          $scope.plot = $.plot(canvasElem, _.compact(series), options);

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
