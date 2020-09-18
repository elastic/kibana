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

import '../../flot';
import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment-timezone';
// @ts-ignore
import observeResize from '../../lib/observe_resize';
import {
  calculateInterval,
  DEFAULT_TIME_FORMAT,
  tickFormatters,
  xaxisFormatterProvider,
  generateTicksProvider,
} from '../../../../vis_type_timelion/public';
import { TimelionVisualizationDependencies } from '../../application';

const DEBOUNCE_DELAY = 50;

export function timechartFn(dependencies: TimelionVisualizationDependencies) {
  const {
    $rootScope,
    $compile,
    uiSettings,
    data: {
      query: { timefilter },
    },
  } = dependencies;

  return function () {
    return {
      help: 'Draw a timeseries chart',
      render($scope: any, $elem: any) {
        const template = '<div class="chart-top-title"></div><div class="chart-canvas"></div>';
        const formatters = tickFormatters() as any;
        const getxAxisFormatter = xaxisFormatterProvider(uiSettings);
        const generateTicks = generateTicksProvider();

        // TODO: I wonder if we should supply our own moment that sets this every time?
        // could just use angular's injection to provide a moment service?
        moment.tz.setDefault(uiSettings.get('dateFormat:tz'));

        const render = $scope.seriesList.render || {};

        $scope.chart = $scope.seriesList.list;
        $scope.interval = $scope.interval;
        $scope.search = $scope.search || _.noop;

        let legendValueNumbers: any;
        let legendCaption: any;
        const debouncedSetLegendNumbers = _.debounce(setLegendNumbers, DEBOUNCE_DELAY, {
          maxWait: DEBOUNCE_DELAY,
          leading: true,
          trailing: false,
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
            color: '#ccc',
          },
          crosshair: {
            mode: 'x',
            color: '#C66',
            lineWidth: 2,
          },
          grid: {
            show: render.grid,
            borderWidth: 0,
            borderColor: null,
            margin: 10,
            hoverable: true,
            autoHighlight: false,
          },
          legend: {
            backgroundColor: 'rgb(255,255,255,0)',
            position: 'nw',
            labelBoxBorderColor: 'rgb(255,255,255,0)',
            labelFormatter(label: any, series: any) {
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
            },
          },
          colors: [
            '#01A4A4',
            '#C66',
            '#D0D102',
            '#616161',
            '#00A1CB',
            '#32742C',
            '#F18D05',
            '#113F8C',
            '#61AE24',
            '#D70060',
          ],
        };

        const originalColorMap = new Map();
        $scope.chart.forEach((series: any, seriesIndex: any) => {
          if (!series.color) {
            const colorIndex = seriesIndex % defaultOptions.colors.length;
            series.color = defaultOptions.colors[colorIndex];
          }
          originalColorMap.set(series, series.color);
        });

        let highlightedSeries: any;
        let focusedSeries: any;
        function unhighlightSeries() {
          if (highlightedSeries === null) {
            return;
          }

          highlightedSeries = null;
          focusedSeries = null;
          $scope.chart.forEach((series: any) => {
            series.color = originalColorMap.get(series); // reset the colors
          });
          drawPlot($scope.chart);
        }
        $scope.highlightSeries = _.debounce(function (id: any) {
          if (highlightedSeries === id) {
            return;
          }

          highlightedSeries = id;
          $scope.chart.forEach((series: any, seriesIndex: any) => {
            if (seriesIndex !== id) {
              series.color = 'rgba(128,128,128,0.1)'; // mark as grey
            } else {
              series.color = originalColorMap.get(series); // color it like it was
            }
          });
          drawPlot($scope.chart);
        }, DEBOUNCE_DELAY);
        $scope.focusSeries = function (id: any) {
          focusedSeries = id;
          $scope.highlightSeries(id);
        };

        $scope.toggleSeries = function (id: any) {
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

        $elem.on('plothover', function (event: any, pos: any, item: any) {
          $rootScope.$broadcast('timelionPlotHover', event, pos, item);
        });

        $elem.on('plotselected', function (event: any, ranges: any) {
          timefilter.timefilter.setTime({
            from: moment(ranges.xaxis.from),
            to: moment(ranges.xaxis.to),
          });
        });

        $elem.on('mouseleave', function () {
          $rootScope.$broadcast('timelionPlotLeave');
        });

        $scope.$on('timelionPlotHover', function (angularEvent: any, flotEvent: any, pos: any) {
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
        function setLegendNumbers(pos: any) {
          unhighlightSeries();

          const plot = $scope.plot;

          const axes = plot.getAxes();
          if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max) {
            return;
          }

          let i;
          const dataset = plot.getData();
          if (legendCaption) {
            legendCaption.text(
              moment(pos.x).format(
                _.get(dataset, '[0]._global.legend.timeFormat', DEFAULT_TIME_FORMAT)
              )
            );
          }
          for (i = 0; i < dataset.length; ++i) {
            const series = dataset[i];
            const useNearestPoint = series.lines.show && !series.lines.steps;
            const precision = _.get(series, '_meta.precision', 2);

            if (series._hide) continue;

            const currentPoint = series.data.find((point: any, index: number) => {
              if (index + 1 === series.data.length) {
                return true;
              }
              if (useNearestPoint) {
                return pos.x - point[0] < series.data[index + 1][0] - pos.x;
              } else {
                return pos.x < series.data[index + 1][0];
              }
            });

            const y = currentPoint[1];

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
        function drawPlot(plotConfig: any) {
          if (!$('.chart-canvas', $elem).length) $elem.html(template);
          const canvasElem = $('.chart-canvas', $elem);

          // we can't use `$.plot` to draw the chart when the height or width is 0
          // so, we'll need another event to trigger drawPlot to actually draw it
          if (canvasElem.height() === 0 || canvasElem.width() === 0) {
            return;
          }

          const title = _(plotConfig).map('_title').compact().last() as any;
          $('.chart-top-title', $elem).text(title == null ? '' : title);

          const options = _.cloneDeep(defaultOptions) as any;

          // Get the X-axis tick format
          const time = timefilter.timefilter.getBounds() as any;
          const interval = calculateInterval(
            time.min.valueOf(),
            time.max.valueOf(),
            uiSettings.get('timelion:target_buckets') || 200,
            $scope.interval,
            uiSettings.get('timelion:min_interval') || '1ms'
          );
          const format = getxAxisFormatter(interval);

          // Use moment to format ticks so we get timezone correction
          options.xaxis.tickFormatter = function (val: any) {
            return moment(val).format(format);
          };

          // Calculate how many ticks can fit on the axis
          const tickLetterWidth = 7;
          const tickPadding = 45;
          options.xaxis.ticks = Math.floor(
            $elem.width() / (format.length * tickLetterWidth + tickPadding)
          );

          const series = _.map(plotConfig, function (serie: any, index) {
            serie = _.cloneDeep(
              _.defaults(serie, {
                shadowSize: 0,
                lines: {
                  lineWidth: 3,
                },
              })
            );
            serie._id = index;

            if (serie.color) {
              const span = document.createElement('span');
              span.style.color = serie.color;
              serie.color = span.style.color;
            }

            if (serie._hide) {
              serie.data = [];
              serie.stack = false;
              // serie.color = "#ddd";
              serie.label = '(hidden) ' + serie.label;
            }

            if (serie._global) {
              _.mergeWith(options, serie._global, function (objVal, srcVal) {
                // This is kind of gross, it means that you can't replace a global value with a null
                // best you can do is an empty string. Deal with it.
                if (objVal == null) return srcVal;
                if (srcVal == null) return objVal;
              });
            }

            return serie;
          });

          if (options.yaxes) {
            options.yaxes.forEach((yaxis: any) => {
              if (yaxis && yaxis.units) {
                yaxis.tickFormatter = formatters[yaxis.units.type];
                const byteModes = ['bytes', 'bytes/s'];
                if (byteModes.includes(yaxis.units.type)) {
                  yaxis.tickGenerator = generateTicks;
                }
              }
            });
          }

          // @ts-ignore
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
      },
    };
  };
}
