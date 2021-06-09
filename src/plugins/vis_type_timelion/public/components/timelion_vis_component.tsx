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
  BrushEndListener,
  PointerEvent,
  LegendPositionConfig,
  LayoutDirection,
} from '@elastic/charts';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { useKibana } from '../../../kibana_react/public';

import { AreaSeriesComponent } from './area_series';
import { BarSeriesComponent } from './bar_series';

import { createTickFormat, colors, Axis as IAxis, activeCursor$ } from '../helpers/panel_utils';
import { tickFormatters } from '../helpers/tick_formatters';

import { Series, Sheet } from '../helpers/timelion_request_handler';
import { TimelionVisDependencies } from '../plugin';

import './timelion_vis.scss';

interface TimelionVisComponentProps {
  fireEvent: IInterpreterRenderHandlers['event'];
  interval: string;
  seriesList: Sheet;
  renderComplete: IInterpreterRenderHandlers['done'];
}

const handleCursorUpdate = (cursor: PointerEvent) => {
  activeCursor$.next(cursor);
};

function TimelionVisComponent({
  interval,
  seriesList,
  renderComplete,
  fireEvent,
}: TimelionVisComponentProps) {
  const kibana = useKibana<TimelionVisDependencies>();
  const [chart, setChart] = useState(() => cloneDeep(seriesList.list));
  const chartRef = useRef<Chart>();

  const updateYAxes = function (yaxes: IAxis[]) {
    yaxes.forEach((yaxis: IAxis) => {
      if (yaxis) {
        if (yaxis.units) {
          const formatters = tickFormatters(yaxis);
          yaxis.tickFormatter = formatters[yaxis.units.type as keyof typeof formatters];
        } else if (yaxis.tickDecimals) {
          yaxis.tickFormatter = (val: number) => val.toFixed(yaxis.tickDecimals);
        }

        yaxis.domain = {
          fit: true,
          ...(yaxis.max ? { max: yaxis.max } : {}),
          ...(yaxis.min ? { min: yaxis.min } : {}),
        };
      }
    });
  };

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

  const getLegendPosition = useCallback(() => {
    let chartLegendGlobal: Record<any, any> = {};
    chart.forEach((series) => {
      if (series._global?.legend) {
        chartLegendGlobal = {
          ...chartLegendGlobal,
          ...series._global.legend,
        };
      }
    });

    const legendPositionConf: LegendPositionConfig = {
      floating: true,
      floatingColumns: chartLegendGlobal?.noColumns ?? 1,
      vAlign: Position.Top,
      hAlign: Position.Left,
      direction: LayoutDirection.Vertical,
    };

    switch (chartLegendGlobal?.position) {
      case 'ne':
        legendPositionConf.vAlign = Position.Top;
        legendPositionConf.hAlign = Position.Right;
        break;
      case 'nw':
        legendPositionConf.vAlign = Position.Top;
        legendPositionConf.hAlign = Position.Left;
        break;
      case 'se':
        legendPositionConf.vAlign = Position.Bottom;
        legendPositionConf.hAlign = Position.Right;
        break;
      case 'sw':
        legendPositionConf.vAlign = Position.Bottom;
        legendPositionConf.hAlign = Position.Left;
        break;
    }

    return legendPositionConf;
  }, [chart]);

  const brushEndListener = useCallback<BrushEndListener>(
    ({ x }) => {
      if (!x) {
        return;
      }

      fireEvent({
        name: 'applyFilter',
        data: {
          timeFieldName: '*',
          filters: [
            {
              range: {
                '*': {
                  gte: x[0],
                  lte: x[1],
                },
              },
            },
          ],
        },
      });
    },
    [fireEvent]
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

  const yaxes = useMemo(() => {
    const collectedYAxes: IAxis[] = [];

    chart.forEach((chartInst) => {
      chartInst._global?.yaxes.forEach((yaxis: IAxis) => {
        if (yaxis) {
          collectedYAxes.push(yaxis);
        }
      });
    });

    return collectedYAxes;
  }, [chart]);

  return (
    <div className="timelionChart">
      <div className="timelionChart__topTitle">{title}</div>
      <Chart ref={chartRef as RefObject<Chart>} renderer="canvas" size={{ width: '100%' }}>
        <Settings
          onBrushEnd={brushEndListener}
          showLegend
          legendPosition={getLegendPosition()}
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
        {yaxes.length ? (
          yaxes.map((axis: IAxis, index: number) => {
            return (
              <Axis
                key={index}
                id={axis.position + axis.axisLabel}
                title={axis.axisLabel}
                position={axis.position}
                tickFormat={axis.tickFormatter}
                domain={axis.domain as YDomainRange}
              />
            );
          })
        ) : (
          <Axis id="left" position={Position.Left} />
        )}
        {chart.map((data, index) => {
          const key = `${index}-${data.label}`;
          if (data.bars) {
            return <BarSeriesComponent key={key} data={data} index={index} />;
          }

          return <AreaSeriesComponent key={key} data={data} index={index} />;
        })}
      </Chart>
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimelionVisComponent as default };
