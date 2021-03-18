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

// @ts-expect-error
import { ErrorComponent } from './error';
import { TimeseriesVisTypes } from './vis_types';
import { TimeseriesVisParams } from '../../types';
import { getDataStart } from '../../services';
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
    async (gte: string, lte: string, table: any) => {
      const indexPattern = await getDataStart().indexPatterns.find(
        model.index_pattern ?? model.default_index_pattern
      );
      const columns = table.columns.map((column) => {
        const field = indexPattern[0].getFieldByName(column.name);
        const cleanedColumn = {
          id: column.id,
          name: column.name,
          meta: {
            type: field?.spec.type || 'number',
            field: column.name,
            index: model.index_pattern ?? model.default_index_pattern,
            source: 'esaggs',
            sourceParams: {
              enabled: true,
              indexPatternId: indexPattern[0]?.id,
              type: 'date_histogram',
            },
          },
        };
        return cleanedColumn;
      });
      const newTable = { ...table, columns };
      const range: [number, number] = [parseInt(gte, 10), parseInt(lte, 10)];
      const event = {
        data: {
          table: newTable,
          column: 0,
          range,
          timeFieldName: model.time_field ?? model.default_timefield,
        },
        name: 'brush',
      };
      handlers.event(event);
      // handlers.event({
      //   name: 'brush',
      //   data: {
      //     timeFieldName: '*',
      //     filters: [
      //       {
      //         range: {
      //           '*': {
      //             gte,
      //             lte,
      //           },
      //         },
      //       },
      //     ],
      //   },
      // });
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
