/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { compact, last, map } from 'lodash';
import {
  Chart,
  Settings,
  Position,
  Axis,
  TooltipType,
  PointerEvent,
  LegendPositionConfig,
  LayoutDirection,
} from '@elastic/charts';

import { useKibana } from '../../../kibana_react/public';

import { AreaSeriesComponent, BarSeriesComponent } from './series';

import {
  extractYAxis,
  createTickFormat,
  validateLegendPositionValue,
} from '../helpers/panel_utils';

import { colors } from '../helpers/chart_constants';
import { activeCursor$ } from '../helpers/active_cursor';

import type { Sheet } from '../helpers/timelion_request_handler';
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

const MAIN_GROUP_ID = 1;

const DefaultYAxis = () => <Axis id="left" position={Position.Left} groupId={`${MAIN_GROUP_ID}`} />;

const TimelionVisComponent = ({
  interval,
  seriesList,
  renderComplete,
  onBrushEvent,
}: TimelionVisComponentProps) => {
  const kibana = useKibana<TimelionVisDependencies>();
  const chartRef = useRef<Chart>(null);
  const chart = seriesList.list;

  useEffect(() => {
    const subscription = activeCursor$.subscribe((cursor: PointerEvent) => {
      chartRef.current?.dispatchExternalPointerEvent(cursor);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      <Chart ref={chartRef} renderer="canvas" size={{ width: '100%' }}>
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
            const yaxis = extractYAxis(data);

            return yaxis ? (
              <Axis
                groupId={`${data.yaxis ? data.yaxis : MAIN_GROUP_ID}`}
                key={index}
                id={yaxis.position + yaxis.axisLabel}
                title={yaxis.axisLabel}
                position={yaxis.position}
                tickFormat={yaxis.tickFormatter}
                domain={yaxis.domain}
              />
            ) : (
              <DefaultYAxis />
            );
          })
        ) : (
          <DefaultYAxis />
        )}

        {chart.map((data, index) => {
          const visData = { ...data };
          const SeriesComponent = data.bars ? BarSeriesComponent : AreaSeriesComponent;

          if (!visData.color) {
            visData.color = colors[index % colors.length];
          }

          return (
            <SeriesComponent
              key={`${index}-${visData.label}`}
              visData={visData}
              index={chart.length - index}
              groupId={`${visData.yaxis ? visData.yaxis : MAIN_GROUP_ID}`}
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
