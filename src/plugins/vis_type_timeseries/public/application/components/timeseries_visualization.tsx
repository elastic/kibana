/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback, useEffect } from 'react';

import { IUiSettingsClient } from 'src/core/public';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { PersistedState } from 'src/plugins/visualizations/public';

// @ts-expect-error
import { ErrorComponent } from './error';
import { TimeseriesVisTypes } from './vis_types';
import { TimeseriesVisParams } from '../../metrics_fn';
import { TimeseriesVisData } from '../../../common/types';

interface TimeseriesVisualizationProps {
  className?: string;
  getConfig: IUiSettingsClient['get'];
  handlers: IInterpreterRenderHandlers;
  model: TimeseriesVisParams;
  visData: TimeseriesVisData;
  uiState: PersistedState;
}

function TimeseriesVisualization({
  className = 'tvbVis',
  visData,
  model,
  handlers,
  uiState,
  getConfig,
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
      />
    );
  }

  return <div className={className} />;
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimeseriesVisualization as default };
