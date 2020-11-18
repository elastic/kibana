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

import React, { useCallback, useEffect } from 'react';

import { IUiSettingsClient } from 'src/core/public';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { PersistedState } from 'src/plugins/visualizations/public';

// @ts-expect-error
import { ErrorComponent } from './error';
import { TimeseriesVisTypes } from './vis_types';
import { TimeseriesVisParams } from '../../metrics_fn';
import { TimeseriesVisData } from '../../types';

interface TimeseriesVisualizationProps {
  className?: string;
  dateFormat: string;
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
  ...visProps
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
        {...visProps}
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
