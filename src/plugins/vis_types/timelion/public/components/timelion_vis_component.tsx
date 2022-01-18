/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { compact, last, map } from 'lodash';
import {
  Chart,
  Settings,
  Position,
  Axis,
  TooltipType,
  LegendPositionConfig,
  LayoutDirection,
} from '@elastic/charts';
import { EuiTitle } from '@elastic/eui';
import { RangeFilterParams } from '@kbn/es-query';

import { useKibana } from '../../../../kibana_react/public';
import { useActiveCursor } from '../../../../charts/public';

import { AreaSeriesComponent, BarSeriesComponent } from './series';

import {
  extractAllYAxis,
  withStaticPadding,
  createTickFormat,
  validateLegendPositionValue,
  MAIN_GROUP_ID,
} from '../helpers/panel_utils';

import { colors } from '../helpers/chart_constants';
import { getCharts } from '../helpers/plugin_services';

import type { Sheet } from '../helpers/timelion_request_handler';
import type { IInterpreterRenderHandlers } from '../../../../expressions';
import type { TimelionVisDependencies } from '../plugin';
import type { Series } from '../helpers/timelion_request_handler';

import './timelion_vis.scss';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

interface TimelionVisComponentProps {
  interval: string;
  seriesList: Sheet;
  onBrushEvent: (rangeFilterParams: RangeFilterParams) => void;
  renderComplete: IInterpreterRenderHandlers['done'];
  ariaLabel?: string;
}

const DefaultYAxis = () => (
  <Axis
    id="left"
    domain={withStaticPadding({
      fit: false,
      min: NaN,
      max: NaN,
    })}
    position={Position.Left}
    groupId={`${MAIN_GROUP_ID}`}
  />
);

const renderYAxis = (series: Series[]) => {
  const yAxisOptions = extractAllYAxis(series);

  const yAxis = yAxisOptions.map((option, index) => (
    <Axis
      groupId={option.groupId}
      key={index}
      id={option.id!}
      title={option.title}
      position={option.position}
      tickFormat={option.tickFormat}
      gridLine={{
        visible: !index,
      }}
      domain={option.domain}
    />
  ));

  return yAxis.length ? yAxis : <DefaultYAxis />;
};

export const TimelionVisComponent = ({
  interval,
  seriesList,
  renderComplete,
  onBrushEvent,
  ariaLabel,
}: TimelionVisComponentProps) => {
  const kibana = useKibana<TimelionVisDependencies>();
  const chartRef = useRef<Chart>(null);
  const chart = seriesList.list;
  const chartsService = getCharts();

  const chartTheme = chartsService.theme.useChartsTheme();
  const chartBaseTheme = chartsService.theme.useChartsBaseTheme();

  const handleCursorUpdate = useActiveCursor(chartsService.activeCursor, chartRef, {
    isDateHistogram: true,
  });

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

  const title: string = useMemo(
    () => last(compact(map(seriesList.list, '_title'))) || '',
    [seriesList.list]
  );

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
        const {
          show = true,
          position,
          noColumns = legendPosition.floatingColumns,
        } = series._global?.legend ?? {};

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
    <div className="timelionChart" data-test-subj="timelionChart">
      {title && (
        <EuiTitle className="timelionChart__topTitle" size="xxxs">
          <h4>{title}</h4>
        </EuiTitle>
      )}
      <Chart ref={chartRef} renderer="canvas" size={{ width: '100%' }}>
        <Settings
          debugState={window._echDebugStateFlag ?? false}
          onBrushEnd={brushEndListener}
          showLegend={legend.showLegend}
          showLegendExtra={true}
          legendPosition={legend.legendPosition}
          onRenderChange={onRenderChange}
          onPointerUpdate={handleCursorUpdate}
          theme={chartTheme}
          baseTheme={chartBaseTheme}
          tooltip={{
            snap: true,
            headerFormatter: ({ value }) => tickFormat(value),
            type: TooltipType.VerticalCursor,
          }}
          externalPointerEvents={{ tooltip: { visible: false } }}
          ariaLabel={ariaLabel}
          ariaUseDefaultSummary={!ariaLabel}
        />

        <Axis
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={tickFormat}
          gridLine={{ visible: false }}
        />

        {renderYAxis(chart)}

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
