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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import $ from 'jquery';
import moment from 'moment-timezone';
import { debounce, compact, get, each, cloneDeep, last, map } from 'lodash';

import './timechart/flot';

// @ts-ignore
import { DEFAULT_TIME_FORMAT } from '../../common/lib';

import { getServices } from '../kibana_services';
import { buildSeriesData, buildOptions, SERIES_ID_ATTR, colors } from './utils';

export interface Series {
  _global?: boolean;
  _hide?: boolean;
  _id?: number;
  _title?: string;
  color?: string;
  data: any[];
  fit: string;
  label: string;
  split: string;
  stack?: boolean;
  type: string;
}

interface SeriesList {
  list: Series[];
  render: {
    type: string;
    grid?: boolean;
  };
  type: string;
}
interface PanelProps {
  name: string;
  interval: string;
  seriesList: SeriesList;
  renderComplete(): void;
}

const DEBOUNCE_DELAY = 50;
// ensure legend is the same height with or without a caption so legend items do not move around
const emptyCaption = '<br>';

function Panel({ interval: intervalProp, seriesList, renderComplete }: PanelProps) {
  console.log('Panel');
  const [chart, setChart] = useState(() => cloneDeep(seriesList.list));
  const [canvasElem, setCanvasElem] = useState();
  const [chartElem, setChartElem] = useState();

  const [originalColorMap, setOriginalColorMap] = useState(new Map());

  const [highlightedSeries, setHighlightedSeries] = useState();
  const [focusedSeries, setFocusedSeries] = useState();
  const [plot, setPlot] = useState();

  const canvasRef = useCallback(node => {
    if (node !== null) {
      setCanvasElem(node);
    }
  }, []);

  const elementRef = useCallback(node => {
    if (node !== null) {
      setChartElem(node);
    }
  }, []);

  useEffect(
    () => () => {
      const nodeJQ = $(chartElem);
      nodeJQ.off('plotselected');
      nodeJQ.off('plothover');
      nodeJQ.off('mouseleave');
    },
    [chartElem]
  );

  useEffect(() => {
    setChart(
      seriesList.list.map((series: Series, seriesIndex: number) => {
        const newSeries = { ...series };
        if (!newSeries.color) {
          const colorIndex = seriesIndex % colors.length;
          newSeries.color = colors[colorIndex];
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

  useEffect(() => {
    if (plot && get(plot.getData(), '[0]._global.legend.showTime', true)) {
      const caption = $('<caption class="timChart__legendCaption"></caption>');
      caption.html(emptyCaption);
      setLegendCaption(caption);

      const canvasNode = $(canvasElem);

      canvasNode.find('div.legend table').append(caption);

      setLegendValueNumbers(canvasNode.find('.legendValueNumber'));
      // legend has been re-created. Apply focus on legend element when previously set
      if (focusedSeries || focusedSeries === 0) {
        const $legendLabels = canvasNode.find('div.legend table .legendLabel>span');
        $legendLabels.get(focusedSeries).focus();
      }
    }
  }, [plot, focusedSeries, canvasElem]);

  const highlightSeries = useCallback(
    debounce(({ currentTarget }: JQuery.TriggeredEvent) => {
      const id = Number(currentTarget.getAttribute(SERIES_ID_ATTR));
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
    }, DEBOUNCE_DELAY),
    [highlightedSeries, chart, originalColorMap]
  );

  const focusSeries = useCallback(
    (event: JQuery.TriggeredEvent) => {
      const id = Number(event.currentTarget.getAttribute(SERIES_ID_ATTR));
      setFocusedSeries(id);
      highlightSeries(event);
    },
    [highlightSeries]
  );

  const toggleSeries = useCallback(
    ({ currentTarget }: JQuery.TriggeredEvent) => {
      const id = Number(currentTarget.getAttribute(SERIES_ID_ATTR));
      setChart(
        chart.map((series: Series, seriesIndex: number) => {
          return seriesIndex === id ? { ...series, _hide: !series._hide } : { ...series };
        })
      );
    },
    [chart]
  );

  const options = useMemo(
    () =>
      buildOptions(
        getServices().timefilter,
        intervalProp,
        getServices().uiSettings,
        chartElem && chartElem.clientWidth,
        seriesList.render.grid
      ),
    [seriesList.render.grid, intervalProp, chartElem]
  );

  const updatedSeries = useMemo(() => buildSeriesData(chart, options), [chart, options]);

  useEffect(() => {
    if (canvasElem) {
      // @ts-ignore
      setPlot($.plot(canvasElem, compact(updatedSeries), options));
      const legend = $(canvasElem).find('.legendValue');
      if (legend) {
        legend.click(toggleSeries);
        legend.focus(focusSeries);
        legend.mouseover(highlightSeries);
      }
    }
  }, [canvasElem, options, updatedSeries, toggleSeries, focusSeries, highlightSeries]);

  moment.tz.setDefault(getServices().uiSettings.get('dateFormat:tz'));

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

  const plotHoverHandler = useCallback(
    (event: any, pos: any) => {
      if (!plot) {
        return;
      }
      plot.setCrosshair(pos);
      debouncedSetLegendNumbers(pos);
    },
    [plot, debouncedSetLegendNumbers]
  );
  const mouseLeaveHandler = useCallback(() => {
    if (!plot) {
      return;
    }
    plot.clearCrosshair();
    clearLegendNumbers();
  }, [plot, clearLegendNumbers]);

  const plotSelectedHandler = useCallback((event: any, ranges: any) => {
    getServices().timefilter.setTime({
      from: moment(ranges.xaxis.from),
      to: moment(ranges.xaxis.to),
    });
  }, []);

  useEffect(() => {
    if (chartElem) {
      const $chart = $(chartElem);
      $chart
        .off('plotselected')
        .off('plothover')
        .off('mouseleave');
      $chart
        .on('plotselected', plotSelectedHandler)
        .on('plothover', plotHoverHandler)
        .on('mouseleave', mouseLeaveHandler);
    }
  }, [chartElem, plotSelectedHandler, plotHoverHandler, mouseLeaveHandler]);

  const title: string = last(compact(map(chart, '_title'))) || '';

  return (
    <div ref={elementRef} className="timChart">
      <div className="chart-top-title">{title}</div>
      <div ref={canvasRef} className="chart-canvas" />
    </div>
  );
}

export { Panel };
