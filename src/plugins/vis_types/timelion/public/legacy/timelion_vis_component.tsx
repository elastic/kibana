/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import $ from 'jquery';
import moment from 'moment-timezone';
import { debounce, compact, get, each, cloneDeep, last, map } from 'lodash';
import { useResizeObserver } from '@elastic/eui';
import { RangeFilterParams } from '@kbn/es-query';

import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_TIME_FORMAT } from '../../common/lib';

import {
  buildSeriesData,
  buildOptions,
  SERIES_ID_ATTR,
  LegacyAxis,
  ACTIVE_CURSOR,
  eventBus,
} from './panel_utils';

import { Series, Sheet } from '../helpers/timelion_request_handler';
import { colors } from '../helpers/chart_constants';
import { tickFormatters } from './tick_formatters';
import { generateTicksProvider } from '../helpers/tick_generator';

import type { TimelionVisDependencies } from '../plugin';

import './timelion_vis.scss';

interface CrosshairPlot extends jquery.flot.plot {
  setCrosshair: (pos: Position) => void;
  clearCrosshair: () => void;
}

interface TimelionVisComponentProps {
  onBrushEvent: (rangeFilterParams: RangeFilterParams) => void;
  interval: string;
  seriesList: Sheet;
  renderComplete: IInterpreterRenderHandlers['done'];
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

function TimelionVisComponent({
  interval,
  seriesList,
  renderComplete,
  onBrushEvent,
}: TimelionVisComponentProps) {
  const kibana = useKibana<TimelionVisDependencies>();
  const [chart, setChart] = useState(() => cloneDeep(seriesList.list));
  const [canvasElem, setCanvasElem] = useState<HTMLDivElement>();
  const [chartElem, setChartElem] = useState<HTMLDivElement | null>(null);

  const [originalColorMap, setOriginalColorMap] = useState(() => new Map<Series, string>());

  const [highlightedSeries, setHighlightedSeries] = useState<number | null>(null);
  const [focusedSeries, setFocusedSeries] = useState<number | null>();
  const [plot, setPlot] = useState<jquery.flot.plot>();

  // Used to toggle the series, and for displaying values on hover
  const [legendValueNumbers, setLegendValueNumbers] = useState<JQuery<HTMLElement>>();
  const [legendCaption, setLegendCaption] = useState<JQuery<HTMLElement>>();

  const canvasRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setCanvasElem(node);
    }
  }, []);

  const elementRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setChartElem(node);
    }
  }, []);

  useEffect(
    () => () => {
      if (chartElem) {
        $(chartElem).off('plotselected').off('plothover').off('mouseleave');
      }
    },
    [chartElem]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
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
      if (canvasElem && get(plotData, '[0]._global.legend.showTime', true)) {
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
          chartElem?.clientWidth,
          grid
        );
        const updatedSeries = buildSeriesData(chartValue, options);

        if (options.yaxes) {
          options.yaxes.forEach((yaxis: LegacyAxis) => {
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

        const newPlot = $.plot($(canvasElem), updatedSeries, options);
        setPlot(newPlot);
        renderComplete();

        updateCaption(newPlot.getData());
      }
    },
    [canvasElem, chartElem?.clientWidth, renderComplete, kibana.services, interval, updateCaption]
  );

  const dimensions = useResizeObserver(chartElem);

  useEffect(() => {
    updatePlot(chart, seriesList.render && seriesList.render.grid);
  }, [chart, updatePlot, seriesList.render, dimensions]);

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

      const axes = plot!.getAxes();
      if (pos.x < axes.xaxis.min! || pos.x > axes.xaxis.max!) {
        return;
      }

      const dataset = plot!.getData();
      if (legendCaption) {
        legendCaption.text(
          moment(pos.x).format(get(dataset, '[0]._global.legend.timeFormat', DEFAULT_TIME_FORMAT))
        );
      }
      for (let i = 0; i < dataset.length; ++i) {
        const series = dataset[i];
        const useNearestPoint = series.lines!.show && !series.lines!.steps;
        const precision = get(series, '_meta.precision', 2);

        // We're setting this flag on top on the series object belonging to the flot library, so we're simply casting here.
        if ((series as { _hide?: boolean })._hide) {
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

        if (legendValueNumbers) {
          if (y == null) {
            legendValueNumbers.eq(i).empty();
          } else {
            let label = y.toFixed(precision);
            const formatter = (series.yaxis as unknown as LegacyAxis).tickFormatter;
            if (formatter) {
              label = formatter(Number(label), series.yaxis as unknown as LegacyAxis);
            }
            legendValueNumbers.eq(i).text(`(${label})`);
          }
        }
      }
    },
    [plot, legendValueNumbers, unhighlightSeries, legendCaption]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
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
    each(legendValueNumbers!, (num: Node) => {
      $(num).empty();
    });
  }, [legendCaption, legendValueNumbers]);

  const plotHover = useCallback(
    (pos: Position) => {
      (plot as CrosshairPlot).setCrosshair(pos);
      debouncedSetLegendNumbers(pos);
    },
    [plot, debouncedSetLegendNumbers]
  );

  const plotHoverHandler = useCallback(
    (event: JQuery.TriggeredEvent, pos: Position) => {
      if (!plot) {
        return;
      }
      plotHover(pos);
      eventBus.trigger(ACTIVE_CURSOR, [event, pos]);
    },
    [plot, plotHover]
  );

  useEffect(() => {
    const updateCursor = (_: any, event: JQuery.TriggeredEvent, pos: Position) => {
      if (!plot) {
        return;
      }
      plotHover(pos);
    };

    eventBus.on(ACTIVE_CURSOR, updateCursor);

    return () => {
      eventBus.off(ACTIVE_CURSOR, updateCursor);
    };
  }, [plot, plotHover]);

  const mouseLeaveHandler = useCallback(() => {
    if (!plot) {
      return;
    }
    (plot as CrosshairPlot).clearCrosshair();
    clearLegendNumbers();
  }, [plot, clearLegendNumbers]);

  const plotSelectedHandler = useCallback(
    (event: JQuery.TriggeredEvent, ranges: Ranges) => {
      onBrushEvent({
        gte: ranges.xaxis.from,
        lte: ranges.xaxis.to,
      });
    },
    [onBrushEvent]
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

  const title: string = useMemo(
    () => last(compact(map(seriesList.list, '_title'))) || '',
    [seriesList.list]
  );

  return (
    <div ref={elementRef} className="timChart">
      <div className="chart-top-title">{title}</div>
      <div ref={canvasRef} className="chart-canvas" />
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimelionVisComponent as default };
