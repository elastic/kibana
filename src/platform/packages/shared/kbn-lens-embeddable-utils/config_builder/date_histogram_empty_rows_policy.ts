/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateHistogramIndexPatternColumn, GenericIndexPatternColumn } from '@kbn/lens-common';
import { getDateHistogramEmptyRowsPolicyForVisualizationState } from '@kbn/lens-common';

interface DatasourceStatesLike {
  formBased?: {
    layers: Record<
      string,
      {
        columns: Record<string, GenericIndexPatternColumn>;
      }
    >;
  };
}

const isDateHistogramColumn = (
  column: GenericIndexPatternColumn
): column is DateHistogramIndexPatternColumn => column.operationType === 'date_histogram';

const hasExplicitIncludeEmptyRowsValue = (column: DateHistogramIndexPatternColumn) =>
  typeof column.params?.includeEmptyRows === 'boolean';

export const applyDateHistogramEmptyRowsPolicyToDatasourceStates = <T extends DatasourceStatesLike>(
  datasourceStates: T,
  visualizationType: string | null | undefined,
  visualizationState: unknown
): T => {
  const policy = getDateHistogramEmptyRowsPolicyForVisualizationState(
    visualizationType,
    visualizationState
  );

  if (!policy || !datasourceStates.formBased) {
    return datasourceStates;
  }

  let hasChanges = false;

  const layers = Object.fromEntries(
    Object.entries(datasourceStates.formBased.layers).map(([layerId, layer]) => {
      let layerHasChanges = false;

      const columns = Object.fromEntries(
        Object.entries(layer.columns).map(([columnId, column]) => {
          if (!isDateHistogramColumn(column) || hasExplicitIncludeEmptyRowsValue(column)) {
            return [columnId, column];
          }

          hasChanges = true;
          layerHasChanges = true;

          return [
            columnId,
            {
              ...column,
              params: {
                ...(column.params ?? {}),
                includeEmptyRows: policy.defaultValue,
              },
            },
          ];
        })
      );

      return [layerId, layerHasChanges ? { ...layer, columns } : layer];
    })
  );

  if (!hasChanges) {
    return datasourceStates;
  }

  return {
    ...datasourceStates,
    formBased: {
      ...datasourceStates.formBased,
      layers,
    },
  } as T;
};
