/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

require('./flot');
import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment-timezone';
import observeResize from '../../lib/observe_resize';
import { calculateInterval, DEFAULT_TIME_FORMAT } from '../../../common/lib';
import { timefilter } from 'ui/timefilter';

const DEBOUNCE_DELAY = 50;

export default function timechartFn(Private, config, $rootScope, $compile) {
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
        let legendCaption;
        const debouncedSetLegendNumbers = _.debounce(setLegendNumbers, DEBOUNCE_DELAY, {
          maxWait: DEBOUNCE_DELAY,
          leading: true,
          trailing: false
        });
        // ensure legend is the same height with or without a caption so legend items do not move around
        const emptyCaption = '<br>';

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
            backgroundColor: 'rgb(255,255,255,0)',
            position: 'nw',
            labelBoxBorderColor: 'rgb(255,255,255,0)',
            labelFormatter: function (label, series) {
              const wrapperSpan = document.createElement('span');
              const labelSpan = document.createElement('span');
              const numberSpan = document.createElement('span');

              wrapperSpan.setAttribute('class', 'ngLegendValue');
              wrapperSpan.setAttribute('kbn-accessible-click', '');
              wrapperSpan.setAttribute('ng-click', `toggleSeries(${series._id})`);
              wrapperSpan.setAttribute('ng-focus', `focusSeries(${series._id})`);
              wrapperSpan.setAttribute('ng-mouseover', `highlightSeries(${series._id})`);

              labelSpan.setAttribute('ng-non-bindable', '');
              labelSpan.appendChild(document.createTextNode(label));
              numberSpan.setAttribute('class', 'ngLegendValueNumber');

              wrapperSpan.appendChild(labelSpan);
              wrapperSpan.appendChild(numberSpan);

              return wrapperSpan.outerHTML;
            }
          },
          colors: ['#01A4A4', '#C66', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060']
        };

        const originalColorMap = new Map();
        $scope.chart.forEach((series, seriesIndex) => {
          if (!series.color) {
            const colorIndex = seriesIndex % defaultOptions.colors.length;
            series.color = defaultOptions.colors[colorIndex];
          }
          originalColorMap.set(series, series.color);
        });

        let highlightedSeries;
        let focusedSeries;
        function unhighlightSeries() {
          if (highlightedSeries === null) {
            return;
          }

          highlightedSeries = null;
          focusedSeries = null;
          $scope.chart.forEach((series) => {
            series.color = originalColorMap.get(series); // reset the colors
          });
          drawPlot($scope.chart);
        }
        $scope.highlightSeries = _.debounce(function (id) {
          if (highlightedSeries === id) {
            return;
          }

          highlightedSeries = id;
          $scope.chart.forEach((series, seriesIndex) => {
            if (seriesIndex !== id) {
              series.color = 'rgba(128,128,128,0.1)'; // mark as grey
            } else {
              series.color = originalColorMap.get(series); // color it like it was
            }
          });
          drawPlot($scope.chart);
        }, DEBOUNCE_DELAY);
        $scope.focusSeries = function (id) {
          focusedSeries = id;
          $scope.highlightSeries(id);
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
          timefilter.setTime({
            from: moment(ranges.xaxis.from),
            to: moment(ranges.xaxis.to),
            mode: 'absolute',
          });
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
          unhighlightSeries();

          const plot = $scope.plot;

          const axes = plot.getAxes();
          if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max) {
            return;
          }

          let i;
          let j;
          const dataset = plot.getData();
          if (legendCaption) {
            legendCaption.text(moment(pos.x).format(_.get(dataset, '[0]._global.legend.timeFormat', DEFAULT_TIME_FORMAT)));
          }
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
          if (legendCaption) {
            legendCaption.html(emptyCaption);
          }
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
            $scope.interval,
            config.get('timelion:min_interval') || '1ms',
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

            if (series.color) {
              const span = document.createElement('span');
              span.style.color = series.color;
              series.color = span.style.color;
            }

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
            $scope.$emit('timelionChartRendered');
          }

          legendScope.$destroy();
          legendScope = $scope.$new();
          // Used to toggle the series, and for displaying values on hover
          legendValueNumbers = canvasElem.find('.ngLegendValueNumber');
          _.each(canvasElem.find('.ngLegendValue'), function (elem) {
            $compile(elem)(legendScope);
          });

          if (_.get($scope.plot.getData(), '[0]._global.legend.showTime', true)) {
            legendCaption = $('<caption class="timChart__legendCaption"></caption>');
            legendCaption.html(emptyCaption);
            canvasElem.find('div.legend table').append(legendCaption);

            // legend has been re-created. Apply focus on legend element when previously set
            if (focusedSeries || focusedSeries === 0) {
              const $legendLabels = canvasElem.find('div.legend table .legendLabel>span');
              $legendLabels.get(focusedSeries).focus();
            }
          }
        }
        $scope.$watch('chart', drawPlot);
      }
    };
  };
}
