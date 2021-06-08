/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './timeseries_visualization.scss';

import React, { useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { XYChartSeriesIdentifier, GeometryValue } from '@elastic/charts';
import { IUiSettingsClient } from 'src/core/public';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { PersistedState } from 'src/plugins/visualizations/public';
import { PaletteRegistry } from 'src/plugins/charts/public';

// @ts-expect-error
import { ErrorComponent } from './error';
import { TimeseriesVisTypes } from './vis_types';
import type { PanelData, TimeseriesVisData } from '../../../common/types';
import { isVisSeriesData, isVisTableData } from '../../../common/vis_data_utils';
import { TimeseriesVisParams } from '../../types';
import { convertSeriesToDataTable } from './lib/convert_series_to_datatable';
import { getClickFilterData } from './lib/get_click_filter_data';
import { X_ACCESSOR_INDEX } from '../visualizations/constants';
import { LastValueModeIndicator } from './last_value_mode_indicator';
import { getInterval } from './lib/get_interval';
import { AUTO_INTERVAL } from '../../../common/constants';
import { TIME_RANGE_DATA_MODES, PANEL_TYPES } from '../../../common/enums';
import type { IndexPattern } from '../../../../data/common';

interface TimeseriesVisualizationProps {
  className?: string;
  getConfig: IUiSettingsClient['get'];
  handlers: IInterpreterRenderHandlers;
  model: TimeseriesVisParams;
  visData: TimeseriesVisData;
  uiState: PersistedState;
  syncColors: boolean;
  palettesService: PaletteRegistry;
  indexPattern?: IndexPattern | null;
}

function TimeseriesVisualization({
  className = 'tvbVis',
  visData,
  model,
  handlers,
  uiState,
  getConfig,
  syncColors,
  palettesService,
  indexPattern,
}: TimeseriesVisualizationProps) {
  const onBrush = useCallback(
    async (gte: string, lte: string, series: PanelData[]) => {
      let event;
      // trigger applyFilter if no index pattern found, url drilldowns are supported only
      // for the index pattern mode
      if (indexPattern) {
        const tables = indexPattern
          ? await convertSeriesToDataTable(model, series, indexPattern)
          : null;
        const table = tables?.[model.series[0].id];

        const range: [number, number] = [parseInt(gte, 10), parseInt(lte, 10)];
        event = {
          data: {
            table,
            column: X_ACCESSOR_INDEX,
            range,
            timeFieldName: indexPattern?.timeFieldName,
          },
          name: 'brush',
        };
      } else {
        event = {
          name: 'applyFilter',
          data: {
            timeFieldName: '*',
            filters: [
              {
                range: {
                  '*': {
                    gte,
                    lte,
                  },
                },
              },
            ],
          },
        };
      }

      handlers.event(event);
    },
    [handlers, indexPattern, model]
  );

  const handleFilterClick = useCallback(
    async (series: PanelData[], points: Array<[GeometryValue, XYChartSeriesIdentifier]>) => {
      // it should work only if index pattern is found
      if (!indexPattern) return;

      const tables = indexPattern
        ? await convertSeriesToDataTable(model, series, indexPattern)
        : null;

      if (!tables) return;

      const data = getClickFilterData(points, tables, model);

      const event = {
        name: 'filterBucket',
        data: {
          data,
          negate: false,
          timeFieldName: indexPattern.timeFieldName,
        },
      };

      handlers.event(event);
    },
    [handlers, indexPattern, model]
  );

  const handleUiState = useCallback(
    (field: string, value: { column: string; order: string }) => {
      uiState.set(field, value);
      // reload visualization because data might need to be re-fetched
      uiState.emit('reload');
    },
    [uiState]
  );

  useEffect(() => {
    handlers.done();
  });

  // Show the error panel
  const error = isVisSeriesData(visData) && visData[model.id]?.error;
  if (error) {
    return (
      <div className={className}>
        <ErrorComponent error={error} />
      </div>
    );
  }

  const VisComponent = TimeseriesVisTypes[model.type];

  const isLastValueMode =
    !model.time_range_mode || model.time_range_mode === TIME_RANGE_DATA_MODES.LAST_VALUE;
  const shouldDisplayLastValueIndicator =
    isLastValueMode && !model.hide_last_value_indicator && model.type !== PANEL_TYPES.TIMESERIES;

  const series = (isVisTableData(visData) ? visData.series : visData?.[model.id]?.series) ?? [];

  if (VisComponent) {
    return (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        {shouldDisplayLastValueIndicator && (
          <EuiFlexItem className="tvbLastValueIndicator" grow={false}>
            <LastValueModeIndicator
              seriesData={series[0].data ?? undefined}
              ignoreDaylightTime={model.ignore_daylight_time}
              panelInterval={getInterval(visData, model)}
              modelInterval={model.interval ?? AUTO_INTERVAL}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <VisComponent
            getConfig={getConfig}
            model={model}
            visData={visData}
            uiState={uiState}
            onBrush={onBrush}
            onFilterClick={handleFilterClick}
            onUiState={handleUiState}
            syncColors={syncColors}
            palettesService={palettesService}
            fieldFormatMap={indexPattern?.fieldFormatMap}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <div className={className} />;
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimeseriesVisualization as default };
