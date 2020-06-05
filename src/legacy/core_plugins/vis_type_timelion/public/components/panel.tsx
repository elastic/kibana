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

import { useKibana } from '../../../../../plugins/kibana_react/public';
import '../flot';
import { DEFAULT_TIME_FORMAT } from '../../../../../plugins/timelion/common/lib';

import {
  buildSeriesData,
  buildOptions,
  SERIES_ID_ATTR,
  colors,
  Axis,
} from '../helpers/panel_utils';
import { Series, Sheet } from '../helpers/timelion_request_handler';
import { tickFormatters } from '../helpers/tick_formatters';
import { generateTicksProvider } from '../helpers/tick_generator';
import { TimelionVisDependencies } from '../plugin';

interface PanelProps {
  interval: string;
  seriesList: Sheet;
  renderComplete(): void;
}

interface Position {
  x: number;
  x1: number;
  y: number;
  y1: number;
  pageX: number;
  pageY: number;
}

interface Range {
  to: number;
  from: number;
}

interface Ranges {
  xaxis: Range;
  yaxis: Range;
}

const DEBOUNCE_DELAY = 50;
// ensure legend is the same height with or without a caption so legend items do not move around
const emptyCaption = '<br>';

function Panel({ interval, seriesList, renderComplete }: PanelProps) {
  const kibana = useKibana<TimelionVisDependencies>();
  const [chart, setChart] = useState(() => cloneDeep(seriesList.list));
  const [canvasElem, setCanvasElem] = useState();
  const [chartElem, setChartElem] = useState();

  const [originalColorMap, setOriginalColorMap] = useState(() => new Map<Series, string>());

  const [highlightedSeries, setHighlightedSeries] = useState<number | null>(null);
  const [focusedSeries, setFocusedSeries] = useState();
  const [plot, setPlot] = useState();

  // Used to toggle the series, and for displaying values on hover
  const [legendValueNumbers, setLegendValueNumbers] = useState();
  const [legendCaption, setLegendCaption] = useState();

  const canvasRef = useCallback((node) => {
    if (node !== null) {
      setCanvasElem(node);
    }
  }, []);

  const elementRef = useCallback((node) => {
    if (node !== null) {
      setChartElem(node);
    }
  }, []);

  useEffect(
    () => () => {
      $(chartElem).off('plotselected').off('plothover').off('mouseleave');
    },
    [chartElem]
  );

  const highlightSeries = useCallback(
    debounce(({ currentTarget }: JQuery.TriggeredEvent) => {
      const id = Number(currentTarget.getAttribute(SERIES_ID_ATTR));
      if (highlightedSeries === id) {
        return;
      }

      setHighlightedSeries(id);
      setChart((chartState) =>
        chartState.map((series: Series, seriesIndex: number) => {
          series.color =
            seriesIndex === id
              ? originalColorMap.get(series) // color it like it was
              : 'rgba(128,128,128,0.1)'; // mark as grey

          return series;
        })
      );
    }, DEBOUNCE_DELAY),
    [originalColorMap, highlightedSeries]
  );

  const focusSeries = useCallback(
    (event: JQuery.TriggeredEvent) => {
      const id = Number(event.currentTarget.getAttribute(SERIES_ID_ATTR));
      setFocusedSeries(id);
      highlightSeries(event);
    },
    [highlightSeries]
  );

  const toggleSeries = useCallback(({ currentTarget }: JQuery.TriggeredEvent) => {
    const id = Number(currentTarget.getAttribute(SERIES_ID_ATTR));

    setChart((chartState) =>
      chartState.map((series: Series, seriesIndex: number) => {
        if (seriesIndex === id) {
          series._hide = !series._hide;
        }
        return series;
      })
    );
  }, []);

  const updateCaption = useCallback(
    (plotData: any) => {
      if (get(plotData, '[0]._global.legend.showTime', true)) {
        const caption = $('<caption class="timChart__legendCaption"></caption>');
        caption.html(emptyCaption);
        setLegendCaption(caption);

        const canvasNode = $(canvasElem);
        canvasNode.find('div.legend table').append(caption);
        setLegendValueNumbers(canvasNode.find('.ngLegendValueNumber'));

        const legend = $(canvasElem).find('.ngLegendValue');
        if (legend) {
          legend.click(toggleSeries);
          legend.focus(focusSeries);
          legend.mouseover(highlightSeries);
        }

        // legend has been re-created. Apply focus on legend element when previously set
        if (focusedSeries || focusedSeries === 0) {
          canvasNode.find('div.legend table .legendLabel>span').get(focusedSeries).focus();
        }
      }
    },
    [focusedSeries, canvasElem, toggleSeries, focusSeries, highlightSeries]
  );

  const updatePlot = useCallback(
    (chartValue: Series[], grid?: boolean) => {
      if (canvasElem && canvasElem.clientWidth > 0 && canvasElem.clientHeight > 0) {
        const options = buildOptions(
          interval,
          kibana.services.timefilter,
          kibana.services.uiSettings,
          chartElem && chartElem.clientWidth,
          grid
        );
        const updatedSeries = buildSeriesData(chartValue, options);

        if (options.yaxes) {
          options.yaxes.forEach((yaxis: Axis) => {
            if (yaxis && yaxis.units) {
              const formatters = tickFormatters();
              yaxis.tickFormatter = formatters[yaxis.units.type as keyof typeof formatters];
              const byteModes = ['bytes', 'bytes/s'];
              if (byteModes.includes(yaxis.units.type)) {
                yaxis.tickGenerator = generateTicksProvider();
              }
            }
          });
        }

        const newPlot = $.plot(canvasElem, updatedSeries, options);
        setPlot(newPlot);
        renderComplete();

        updateCaption(newPlot.getData());
      }
    },
    [canvasElem, chartElem, renderComplete, kibana.services, interval, updateCaption]
  );

  useEffect(() => {
    updatePlot(chart, seriesList.render && seriesList.render.grid);
  }, [chart, updatePlot, seriesList.render]);

  useEffect(() => {
    const colorsSet: Array<[Series, string]> = [];
    const newChart = seriesList.list.map((series: Series, seriesIndex: number) => {
      const newSeries = { ...series };
      if (!newSeries.color) {
        const colorIndex = seriesIndex % colors.length;
        newSeries.color = colors[colorIndex];
      }
      colorsSet.push([newSeries, newSeries.color]);
      return newSeries;
    });
    setChart(newChart);
    setOriginalColorMap(new Map(colorsSet));
  }, [seriesList.list]);

  const unhighlightSeries = useCallback(() => {
    if (highlightedSeries === null) {
      return;
    }

    setHighlightedSeries(null);
    setFocusedSeries(null);

    setChart((chartState) =>
      chartState.map((series: Series) => {
        series.color = originalColorMap.get(series); // reset the colors
        return series;
      })
    );
  }, [originalColorMap, highlightedSeries]);

  // Shamelessly borrowed from the flotCrosshairs example
  const setLegendNumbers = useCallback(
    (pos: Position) => {
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

        if (series._hide) {
          continue;
        }

        const currentPoint = series.data.find((point: [number, number], index: number) => {
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
            label = series.yaxis.tickFormatter(Number(label), series.yaxis);
          }
          legendValueNumbers.eq(i).text(`(${label})`);
        } else {
          legendValueNumbers.eq(i).empty();
        }
      }
    },
    [plot, legendValueNumbers, unhighlightSeries, legendCaption]
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
    each(legendValueNumbers, (num: Node) => {
      $(num).empty();
    });
  }, [legendCaption, legendValueNumbers]);

  const plotHoverHandler = useCallback(
    (event: JQuery.TriggeredEvent, pos: Position) => {
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

  const plotSelectedHandler = useCallback(
    (event: JQuery.TriggeredEvent, ranges: Ranges) => {
      kibana.services.timefilter.setTime({
        from: moment(ranges.xaxis.from),
        to: moment(ranges.xaxis.to),
      });
    },
    [kibana.services.timefilter]
  );

  useEffect(() => {
    if (chartElem) {
      $(chartElem).off('plotselected').on('plotselected', plotSelectedHandler);
    }
  }, [chartElem, plotSelectedHandler]);

  useEffect(() => {
    if (chartElem) {
      $(chartElem).off('mouseleave').on('mouseleave', mouseLeaveHandler);
    }
  }, [chartElem, mouseLeaveHandler]);

  useEffect(() => {
    if (chartElem) {
      $(chartElem).off('plothover').on('plothover', plotHoverHandler);
    }
  }, [chartElem, plotHoverHandler]);

  const title: string = useMemo(() => last(compact(map(seriesList.list, '_title'))) || '', [
    seriesList.list,
  ]);

  return (
    <div ref={elementRef} className="timChart">
      <div className="chart-top-title">{title}</div>
      <div ref={canvasRef} className="chart-canvas" />
    </div>
  );
}

export { Panel };
