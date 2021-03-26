/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect } from 'react';

import { IUiSettingsClient } from 'src/core/public';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { PersistedState } from 'src/plugins/visualizations/public';
import { PaletteRegistry } from 'src/plugins/charts/public';

// @ts-expect-error
import { ErrorComponent } from './error';
import { TimeseriesVisTypes } from './vis_types';
import { TimeseriesVisData, PanelData } from '../../../common/types';
import { TimeseriesVisParams } from '../../types';
import { getDataStart } from '../../services';
import { convertSeriesToDataTable } from './lib/convert_series_to_datatable';
import { X_ACCESSOR_INDEX } from '../visualizations/constants';

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
    async (gte: string, lte: string, series: PanelData[]) => {
      const indexPatternString = model.index_pattern || model.default_index_pattern || '';
      const indexPatterns = await getDataStart().indexPatterns.find(indexPatternString);

      const tables = await convertSeriesToDataTable(model, series, indexPatterns[0]);
      const table = tables[model.series[0].id];

      const range: [number, number] = [parseInt(gte, 10), parseInt(lte, 10)];
      const event = {
        data: {
          table,
          column: X_ACCESSOR_INDEX,
          range,
          timeFieldName: indexPatterns[0].timeFieldName,
        },
        name: 'brush',
      };
      handlers.event(event);
    },
    [handlers, model]
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
  const error = visData[model.id]?.error;
  if (error) {
    return (
      <div className={className}>
        <ErrorComponent error={error} />
      </div>
    );
  }

  const VisComponent = TimeseriesVisTypes[model.type];

  if (VisComponent) {
    return (
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
    );
  }

  return <div className={className} />;
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimeseriesVisualization as default };
