/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './timeseries_visualization.scss';

import React, { useCallback, useEffect } from 'react';

import { get } from 'lodash';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { IUiSettingsClient } from 'src/core/public';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { PersistedState } from 'src/plugins/visualizations/public';
import { PaletteRegistry } from 'src/plugins/charts/public';

// @ts-expect-error
import { ErrorComponent } from './error';
import { TimeseriesVisTypes } from './vis_types';
import { TimeseriesVisParams } from '../../types';
import { isVisSeriesData, TimeseriesVisData } from '../../../common/types';
import { LastValueModeIndicator } from './last_value_mode_indicator';
import { getInterval } from './lib/get_interval';
import { AUTO_INTERVAL } from '../../../common/constants';
import { TIME_RANGE_DATA_MODES } from '../../../common/timerange_data_modes';
import { PANEL_TYPES } from '../../../common/panel_types';

interface TimeseriesVisualizationProps {
  className?: string;
  getConfig: IUiSettingsClient['get'];
  handlers: IInterpreterRenderHandlers;
  model: TimeseriesVisParams;
  visData: TimeseriesVisData;
  uiState: PersistedState;
  syncColors: boolean;
  palettesService: PaletteRegistry;
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
}: TimeseriesVisualizationProps) {
  const onBrush = useCallback(
    (gte: string, lte: string) => {
      handlers.event({
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
      });
    },
    [handlers]
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

  if (VisComponent) {
    return (
      <EuiFlexGroup direction="column" gutterSize="none">
        {shouldDisplayLastValueIndicator && (
          <I18nProvider>
            <EuiFlexItem className="tvbLastValueIndicator" grow={false}>
              <LastValueModeIndicator
                seriesData={get(
                  visData,
                  `${isVisSeriesData(visData) ? model.id : 'series[0]'}.series[0].data`,
                  undefined
                )}
                panelInterval={getInterval(visData, model)}
                modelInterval={model.interval ?? AUTO_INTERVAL}
              />
            </EuiFlexItem>
          </I18nProvider>
        )}

        <EuiFlexItem>
          <VisComponent
            getConfig={getConfig}
            model={model}
            visData={visData}
            uiState={uiState}
            onBrush={onBrush}
            onUiState={handleUiState}
            syncColors={syncColors}
            palettesService={palettesService}
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
