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

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import $ from 'jquery';
import moment from 'moment-timezone';
import { debounce, compact, get, each, noop, cloneDeep, last, map } from 'lodash';

import './timechart/flot';

import { tickFormatters } from '../services/tick_formatters';
// @ts-ignore
import { calculateInterval, DEFAULT_TIME_FORMAT } from '../../common/lib';
import { xaxisFormatterProvider } from './timechart/xaxis_formatter';
import { generateTicksProvider } from './timechart/tick_generator';

import { useEventListener } from './useEventListener';

import { getServices } from '../kibana_services';
import { DEBOUNCE_DELAY, emptyCaption, staticDefaultOptions } from './constants';
import { buildSeriesData } from './utils';

export interface Series {
  data: any[];
  fit: string;
  label: string;
  split: string;
  type: string;
  _hide?: boolean;
  _id?: number;
  color?: string;
  stack?: boolean;
  _global?: boolean;
  _title?: string;
}

interface SeriesList {
  list: Series[];
  render: {
    type: string;
    grid?: unknown;
  };
  type: string;
}
interface PanelProps {
  name: string;
  interval: string;
  search?: string;
  seriesList: SeriesList;
  renderComplete(): void;
}

function Panel({ interval: intervalProp, search = noop, seriesList, renderComplete }: PanelProps) {
  console.log('Panel');
  const [chart, setChart] = useState(() => cloneDeep(seriesList.list));
  const elementRef = useRef(null);
  const [canvasElem, setCanvasElem] = useState();
  const { uiSettings, timefilter } = getServices();
  const formatters = tickFormatters() as any;
  const getxAxisFormatter = useMemo(() => xaxisFormatterProvider(uiSettings), [uiSettings]);
  const generateTicks = generateTicksProvider();

  const [originalColorMap, setOriginalColorMap] = useState(new Map());

  const [highlightedSeries, setHighlightedSeries] = useState();
  const [focusedSeries, setFocusedSeries] = useState();
  const [plot, setPlot] = useState();

  const canvasRef = useCallback(node => {
    if (node !== null) {
      setCanvasElem(node);
    }
  }, []);

  useEffect(() => {
    setChart(
      seriesList.list.map((series: Series, seriesIndex: number) => {
        const newSeries = { ...series };
        if (!newSeries.color) {
          const colorIndex = seriesIndex % staticDefaultOptions.colors.length;
          newSeries.color = staticDefaultOptions.colors[colorIndex];
        }
        // setting originalColorMap
        setOriginalColorMap(stateMap => new Map(stateMap.set(newSeries, newSeries.color)));
        return newSeries;
      })
    );
  }, [seriesList.list]);

  // Used to toggle the series, and for displaying values on hover
  const [legendValueNumbers, setLegendValueNumbers] = useState();
  const [legendCaption, setLegendCaption] = useState();

  let legendScope = {};

  useEffect(() => {
    if (plot && get(plot.getData(), '[0]._global.legend.showTime', true)) {
      const caption = $('<caption class="timChart__legendCaption"></caption>');
      caption.html(emptyCaption);
      setLegendCaption(caption);

      const canvasNode = $(canvasElem);

      canvasNode.find('div.legend table').append(caption);

      setLegendValueNumbers(canvasNode.find('.ngLegendValueNumber'));
      // legend has been re-created. Apply focus on legend element when previously set
      if (focusedSeries || focusedSeries === 0) {
        const $legendLabels = canvasNode.find('div.legend table .legendLabel>span');
        $legendLabels.get(focusedSeries).focus();
      }
    }
  }, [plot, focusedSeries, canvasElem]);

  const highlightSeries = useCallback(
    debounce((id: number) => {
      if (highlightedSeries === id) {
        return;
      }

      setHighlightedSeries(id);
      setChart(
        chart.map((series: Series, seriesIndex: number) => {
          const color =
            seriesIndex === id
              ? originalColorMap.get(series) // color it like it was
              : 'rgba(128,128,128,0.1)'; // mark as grey

          return { ...series, color };
        })
      );
      // drawPlot(chart);
    }, DEBOUNCE_DELAY),
    [highlightedSeries, chart, originalColorMap]
  );

  const focusSeries = useCallback(
    (id: number) => {
      setFocusedSeries(id);
      highlightSeries(id);
    },
    [highlightSeries]
  );

  const toggleSeries = useCallback(
    (id: number) => {
      setChart(
        chart.map((series: Series, seriesIndex: number) => {
          return seriesIndex === id ? { ...series, _hide: !series._hide } : { ...series };
        })
      );
      // drawPlot(chart);
    },
    [chart]
  );

  const defaultOptions = useMemo(
    () => ({
      ...staticDefaultOptions,
      grid: {
        show: seriesList.render.grid,
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
          wrapperSpan.addEventListener('click', () => toggleSeries(series._id));
          wrapperSpan.addEventListener('onFocus', () => focusSeries(series._id));
          wrapperSpan.addEventListener('onMouseOver', () => highlightSeries(series._id));

          labelSpan.appendChild(document.createTextNode(label));
          numberSpan.setAttribute('class', 'ngLegendValueNumber');

          wrapperSpan.appendChild(labelSpan);
          wrapperSpan.appendChild(numberSpan);

          return wrapperSpan.outerHTML;
        },
      },
    }),
    [seriesList.render.grid, toggleSeries, focusSeries, highlightSeries]
  );

  const options = useMemo(() => cloneDeep(defaultOptions), [defaultOptions]);

  // Get the X-axis tick format
  const time = timefilter.getBounds() as any;
  const interval = calculateInterval(
    time.min.valueOf(),
    time.max.valueOf(),
    uiSettings.get('timelion:target_buckets') || 200,
    intervalProp,
    uiSettings.get('timelion:min_interval') || '1ms'
  );
  const format = getxAxisFormatter(interval);

  // Use moment to format ticks so we get timezone correction
  options.xaxis.tickFormatter = (val: any) => moment(val).format(format);

  // Calculate how many ticks can fit on the axis
  const tickLetterWidth = 7;
  const tickPadding = 45;
  options.xaxis.ticks = Math.floor(
    elementRef.current
      ? elementRef.current.clientWidth
      : 0 / (format.length * tickLetterWidth + tickPadding)
  );

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

  const updatedSeries = useMemo(() => buildSeriesData(chart, options), [chart, options]);

  useEffect(() => {
    // @ts-ignore
    setPlot($.plot(canvasElem, compact(updatedSeries), options));
  }, [canvasElem, options, updatedSeries]);

  moment.tz.setDefault(uiSettings.get('dateFormat:tz'));

  const unhighlightSeries = useCallback(() => {
    if (highlightedSeries === null) {
      return;
    }

    setHighlightedSeries(null);
    setFocusedSeries(null);
    setChart(
      chart.map((series: Series) => {
        return { ...series, color: originalColorMap.get(series) }; // reset the colors
      })
    );
    // drawPlot(chart);
  }, [chart, originalColorMap, highlightedSeries]);

  // Shamelessly borrowed from the flotCrosshairs example
  const setLegendNumbers = useCallback(
    (pos: any) => {
      unhighlightSeries();

      const axes = plot.getAxes();
      if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max) {
        return;
      }

      const dataset = plot.getData();
      if (legendCaption) {
        legendCaption.text(
          moment(pos.x).format(get(dataset, '[0]._global.legend.timeFormat', DEFAULT_TIME_FORMAT))
        );
      }
      for (let i = 0; i < dataset.length; ++i) {
        const series = dataset[i];
        const useNearestPoint = series.lines.show && !series.lines.steps;
        const precision = get(series, '_meta.precision', 2);

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

        if (y != null && legendValueNumbers) {
          let label = y.toFixed(precision);
          if (series.yaxis.tickFormatter) {
            label = series.yaxis.tickFormatter(label, series.yaxis);
          }
          legendValueNumbers.eq(i).text(`(${label})`);
        } else {
          legendValueNumbers.eq(i).empty();
        }
      }
    },
    [unhighlightSeries, legendCaption, legendValueNumbers, plot]
  );

  const debouncedSetLegendNumbers = useCallback(
    debounce(setLegendNumbers, DEBOUNCE_DELAY, {
      maxWait: DEBOUNCE_DELAY,
      leading: true,
      trailing: false,
    }),
    [setLegendNumbers]
  );

  const clearLegendNumbers = useCallback(() => {
    if (legendCaption) {
      legendCaption.html(emptyCaption);
    }
    each(legendValueNumbers, (num: any) => {
      $(num).empty();
    });
  }, [legendCaption, legendValueNumbers]);

  const plothoverHandler = useCallback(
    (event: any, pos: any, item: any) => {
      if (!plot) {
        return;
      }
      plot.setCrosshair(item);
      debouncedSetLegendNumbers(item);
    },
    [plot, debouncedSetLegendNumbers]
  );
  const mouseleaveHandler = useCallback(() => {
    if (!plot) {
      return;
    }
    plot.clearCrosshair();
    clearLegendNumbers();
  }, [plot, clearLegendNumbers]);
  const plotselectedHandler = useCallback((event: any, ranges: any) => {
    getServices().timefilter.setTime({
      from: moment(ranges.xaxis.from),
      to: moment(ranges.xaxis.to),
    });
  }, []);

  useEventListener(elementRef, 'plothover', plothoverHandler);
  useEventListener(elementRef, 'plotselected', plotselectedHandler);
  useEventListener(elementRef, 'mouseleave', mouseleaveHandler);

  // const cancelResize = observeResize($elem, function() {
  //   drawPlot($scope.chart);
  // });

  // $scope.$on('$destroy', function() {
  //   cancelResize();
  // });

  // we can't use `$.plot` to draw the chart when the height or width is 0
  // so, we'll need another event to trigger drawPlot to actually draw it

  const title: string = last(compact(map(chart, '_title'))) || '';

  return (
    <div ref={elementRef} className="timChart">
      <div className="chart-top-title">{title}</div>
      <div ref={canvasRef} className="chart-canvas" />
    </div>
  );
}

export { Panel };
