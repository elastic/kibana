/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, RefObject } from 'react';
import { compact, cloneDeep, last, map } from 'lodash';
import {
  Chart,
  Settings,
  Position,
  Axis,
  TooltipType,
  YDomainRange,
  PointerEvent,
  LegendPositionConfig,
  LayoutDirection,
} from '@elastic/charts';

import { useKibana } from '../../../kibana_react/public';

import { AreaSeriesComponent, BarSeriesComponent } from './series';

import { createTickFormat, IAxis, validateLegendPositionValue } from '../helpers/panel_utils';
import { colors } from '../helpers/chart_constants';
import { tickFormatters } from '../helpers/tick_formatters';
import { activeCursor$ } from '../helpers/active_cursor';

import type { Series, Sheet } from '../helpers/timelion_request_handler';

import type { IInterpreterRenderHandlers } from '../../../expressions';
import type { TimelionVisDependencies } from '../plugin';
import type { RangeFilterParams } from '../../../data/public';

import './timelion_vis.scss';

interface TimelionVisComponentProps {
  interval: string;
  seriesList: Sheet;
  onBrushEvent: (rangeFilterParams: RangeFilterParams) => void;
  renderComplete: IInterpreterRenderHandlers['done'];
}

// @todo: remove this method, we should not modify global object
const updateYAxes = (yaxes: IAxis[]) => {
  yaxes.forEach((yaxis: IAxis) => {
    if (yaxis) {
      if (yaxis.units) {
        const formatters = tickFormatters(yaxis);
        yaxis.tickFormatter = formatters[yaxis.units.type as keyof typeof formatters];
      } else if (yaxis.tickDecimals) {
        yaxis.tickFormatter = (val: number) => val.toFixed(yaxis.tickDecimals);
      }

      const max = yaxis.max ? yaxis.max : undefined;
      const min = yaxis.min ? yaxis.min : undefined;

      yaxis.domain = {
        fit: min === undefined && max === undefined,
        max,
        min,
      };
    }
  });
};

const MAIN_GROUP_ID = 1;

const DefaultYAxis = () => <Axis id="left" position={Position.Left} groupId={`${MAIN_GROUP_ID}`} />;

const TimelionVisComponent = ({
  interval,
  seriesList,
  renderComplete,
  onBrushEvent,
}: TimelionVisComponentProps) => {
  const kibana = useKibana<TimelionVisDependencies>();
  const [chart, setChart] = useState(() => cloneDeep(seriesList.list));
  const chartRef = useRef<Chart>();

  useEffect(() => {
    const updateCursor = (cursor: PointerEvent) => {
      if (chartRef.current) {
        chartRef.current.dispatchExternalPointerEvent(cursor);
      }
    };

    const subscription = activeCursor$.subscribe(updateCursor);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const newChart = seriesList.list.map((series: Series, seriesIndex: number) => {
      const newSeries = { ...series };
      if (!newSeries.color) {
        const colorIndex = seriesIndex % colors.length;
        newSeries.color = colors[colorIndex];
      }

      if (newSeries._global?.yaxes) {
        updateYAxes(newSeries._global.yaxes);
      }

      return newSeries;
    });

    setChart(newChart);
  }, [seriesList.list]);

  const handleCursorUpdate = useCallback((cursor: PointerEvent) => {
    activeCursor$.next(cursor);
  }, []);

  const brushEndListener = useCallback(
    ({ x }) => {
      if (!x) {
        return;
      }

      onBrushEvent({
        gte: x[0],
        lte: x[1],
      });
    },
    [onBrushEvent]
  );

  const onRenderChange = useCallback(
    (isRendered: boolean) => {
      if (isRendered) {
        renderComplete();
      }
    },
    [renderComplete]
  );

  const title: string = useMemo(() => last(compact(map(seriesList.list, '_title'))) || '', [
    seriesList.list,
  ]);

  const tickFormat = useMemo(
    () => createTickFormat(interval, kibana.services.timefilter, kibana.services.uiSettings),
    [interval, kibana.services.timefilter, kibana.services.uiSettings]
  );

  const legend = useMemo(() => {
    const legendPosition: LegendPositionConfig = {
      floating: true,
      floatingColumns: 1,
      vAlign: Position.Top,
      hAlign: Position.Left,
      direction: LayoutDirection.Vertical,
    };
    let showLegend = true;

    chart.forEach((series) => {
      if (series._global?.legend) {
        const { show = true, position, noColumns = legendPosition.floatingColumns } =
          series._global?.legend ?? {};

        if (validateLegendPositionValue(position)) {
          const [vAlign, hAlign] = position.split('');

          legendPosition.vAlign = vAlign === 'n' ? Position.Top : Position.Bottom;
          legendPosition.hAlign = hAlign === 'e' ? Position.Right : Position.Left;
        }

        if (!show) {
          showLegend = false;
        }

        if (noColumns !== undefined) {
          legendPosition.floatingColumns = noColumns;
        }
      }
    });

    return { legendPosition, showLegend };
  }, [chart]);

  return (
    <div className="timelionChart">
      <div className="timelionChart__topTitle">{title}</div>
      <Chart ref={chartRef as RefObject<Chart>} renderer="canvas" size={{ width: '100%' }}>
        <Settings
          onBrushEnd={brushEndListener}
          showLegend={legend.showLegend}
          legendPosition={legend.legendPosition}
          onRenderChange={onRenderChange}
          onPointerUpdate={handleCursorUpdate}
          theme={kibana.services.chartTheme.useChartsTheme()}
          baseTheme={kibana.services.chartTheme.useChartsBaseTheme()}
          tooltip={{
            snap: true,
            type: TooltipType.VerticalCursor,
          }}
          externalPointerEvents={{ tooltip: { visible: false } }}
        />

        <Axis id="bottom" position={Position.Bottom} showOverlappingTicks tickFormat={tickFormat} />

        {chart.length ? (
          chart.map((data, index) => {
            const { yaxis: y, _global } = data;
            const yaxis = (_global?.yaxes ?? [])[y ? y - 1 : 0];

            return yaxis ? (
              <Axis
                groupId={`${y ? y : 1}`}
                key={index}
                id={yaxis.position + yaxis.axisLabel}
                title={yaxis.axisLabel}
                position={yaxis.position}
                tickFormat={yaxis.tickFormatter}
                domain={yaxis.domain as YDomainRange}
              />
            ) : (
              <DefaultYAxis />
            );
          })
        ) : (
          <DefaultYAxis />
        )}

        {chart.map((data, index) => {
          const SeriesComponent = data.bars ? BarSeriesComponent : AreaSeriesComponent;

          return (
            <SeriesComponent
              key={`${index}-${data.label}`}
              visData={data}
              index={chart.length - index}
              groupId={data.yaxis ? `${data.yaxis}` : `${MAIN_GROUP_ID}`}
            />
          );
        })}
      </Chart>
    </div>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimelionVisComponent as default };
