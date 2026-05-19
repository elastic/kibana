/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateHistogramIndexPatternColumn } from './datasources/operations';
import type { GenericIndexPatternColumn } from './datasources/types';
import { LENS_DATATABLE_ID } from './visualizations/datatable/constants';
import { LENS_HEATMAP_ID } from './visualizations/heatmap/constants';
import { LENS_METRIC_ID } from './visualizations/metric/constants';
import { isPartitionChartTypeWithDefaultEmptyRowsOff } from './visualizations/partition/constants';
import { isBarSeriesType } from './visualizations/xy/constants';

const XY_VISUALIZATION_ID = 'lnsXY';
const PARTITION_VISUALIZATION_ID = 'lnsPie';
const TAGCLOUD_VISUALIZATION_ID = 'lnsTagcloud';
const DEFAULT_EMPTY_ROWS_OFF = false;
const DEFAULT_EMPTY_ROWS_ON = true;

interface StateWithPreferredSeriesType {
  preferredSeriesType?: unknown;
}

interface StateWithShape {
  shape?: unknown;
}

interface FormBasedLayerStateLike {
  layers: Record<
    string,
    {
      columns: Record<string, GenericIndexPatternColumn>;
    }
  >;
}

interface StateWithLayers {
  layers?: unknown;
}

interface DatasourceStatesLike {
  formBased?: FormBasedLayerStateLike;
}

interface ApplyDateHistogramEmptyRowsDefaultOptions {
  overwriteExisting?: boolean;
}

/**
 * This module owns both parts of the empty-rows default flow:
 * - resolve the visualization-family default from visualization state
 * - apply that default to form-based datasource state when Lens needs to materialize it
 */

const isDateHistogramColumn = (
  column: GenericIndexPatternColumn
): column is DateHistogramIndexPatternColumn => column.operationType === 'date_histogram';

const hasExplicitIncludeEmptyRowsValue = (column: DateHistogramIndexPatternColumn) =>
  typeof column.params?.includeEmptyRows === 'boolean';

const isFormBasedLayerStateLike = (
  datasourceState: unknown
): datasourceState is FormBasedLayerStateLike => {
  if (!datasourceState || typeof datasourceState !== 'object') {
    return false;
  }

  const { layers } = datasourceState as StateWithLayers;
  return Boolean(layers && typeof layers === 'object');
};

const getXYSeriesTypeFromState = (visualizationState: unknown) => {
  if (!visualizationState || typeof visualizationState !== 'object') {
    return;
  }

  const { preferredSeriesType } = visualizationState as StateWithPreferredSeriesType;
  return typeof preferredSeriesType === 'string' ? preferredSeriesType : undefined;
};

const getPartitionShapeFromState = (visualizationState: unknown) => {
  if (!visualizationState || typeof visualizationState !== 'object') {
    return;
  }

  const { shape } = visualizationState as StateWithShape;
  return typeof shape === 'string' ? shape : undefined;
};

const shouldKeepDateHistogramColumn = (
  column: DateHistogramIndexPatternColumn,
  defaultValue: boolean,
  overwriteExisting: boolean
) => {
  if (!overwriteExisting && hasExplicitIncludeEmptyRowsValue(column)) {
    return true;
  }

  return column.params?.includeEmptyRows === defaultValue;
};

const applyDateHistogramEmptyRowsDefaultToLayerState = <T extends FormBasedLayerStateLike>(
  datasourceState: T,
  defaultValue: boolean,
  { overwriteExisting = false }: ApplyDateHistogramEmptyRowsDefaultOptions = {}
): T => {
  let hasChanges = false;

  const layers = Object.fromEntries(
    Object.entries(datasourceState.layers).map(([layerId, layer]) => {
      let layerHasChanges = false;

      const columns = Object.fromEntries(
        Object.entries(layer.columns).map(([columnId, column]) => {
          if (
            !isDateHistogramColumn(column) ||
            shouldKeepDateHistogramColumn(column, defaultValue, overwriteExisting)
          ) {
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
                includeEmptyRows: defaultValue,
              },
            },
          ];
        })
      );

      return [layerId, layerHasChanges ? { ...layer, columns } : layer];
    })
  );

  return hasChanges ? ({ ...datasourceState, layers } as T) : datasourceState;
};

/**
 * Returns the default `includeEmptyRows` value for a Lens visualization subtype.
 *
 * Returning `undefined` means the visualization does not force a default and callers
 * should leave the current datasource value untouched.
 */
export const getDateHistogramEmptyRowsDefault = (
  visualizationType: string | null | undefined,
  visualizationSubtype?: string | null
) => {
  switch (visualizationType) {
    case XY_VISUALIZATION_ID:
      return isBarSeriesType(visualizationSubtype) ? DEFAULT_EMPTY_ROWS_OFF : undefined;

    case PARTITION_VISUALIZATION_ID:
      return isPartitionChartTypeWithDefaultEmptyRowsOff(visualizationSubtype)
        ? DEFAULT_EMPTY_ROWS_OFF
        : undefined;

    case LENS_HEATMAP_ID:
    case LENS_METRIC_ID:
    case TAGCLOUD_VISUALIZATION_ID:
      return DEFAULT_EMPTY_ROWS_OFF;

    case LENS_DATATABLE_ID:
      return DEFAULT_EMPTY_ROWS_ON;

    default:
      return;
  }
};

/**
 * Returns the default `includeEmptyRows` value using the persisted visualization state.
 */
export const getDateHistogramEmptyRowsDefaultForVisualizationState = (
  visualizationType: string | null | undefined,
  visualizationState: unknown
) => {
  if (visualizationType === XY_VISUALIZATION_ID) {
    return getDateHistogramEmptyRowsDefault(
      visualizationType,
      getXYSeriesTypeFromState(visualizationState)
    );
  }

  if (visualizationType === PARTITION_VISUALIZATION_ID) {
    return getDateHistogramEmptyRowsDefault(
      visualizationType,
      getPartitionShapeFromState(visualizationState)
    );
  }

  return getDateHistogramEmptyRowsDefault(visualizationType);
};

/**
 * Applies the visualization-specific default to a form-based datasource state.
 *
 * By default this only fills missing `includeEmptyRows` values. Pass
 * `{ overwriteExisting: true }` when a chart switch or suggestion should re-sync
 * the datasource state to the destination visualization's default.
 */
export const applyDateHistogramEmptyRowsDefaultToDatasourceState = <T>(
  datasourceState: T,
  visualizationType: string | null | undefined,
  visualizationState: unknown,
  options?: ApplyDateHistogramEmptyRowsDefaultOptions
) => {
  const defaultValue = getDateHistogramEmptyRowsDefaultForVisualizationState(
    visualizationType,
    visualizationState
  );

  if (defaultValue === undefined || !isFormBasedLayerStateLike(datasourceState)) {
    return datasourceState;
  }

  return applyDateHistogramEmptyRowsDefaultToLayerState(
    datasourceState,
    defaultValue,
    options
  ) as T;
};

/**
 * Applies the visualization-specific default to `formBased` datasource states.
 *
 * By default this only fills missing `includeEmptyRows` values. Pass
 * `{ overwriteExisting: true }` when the caller should re-sync the datasource
 * state to the destination visualization's default.
 */
export const applyDateHistogramEmptyRowsDefaultToDatasourceStates = <
  T extends DatasourceStatesLike
>(
  datasourceStates: T,
  visualizationType: string | null | undefined,
  visualizationState: unknown,
  options?: ApplyDateHistogramEmptyRowsDefaultOptions
): T => {
  const defaultValue = getDateHistogramEmptyRowsDefaultForVisualizationState(
    visualizationType,
    visualizationState
  );

  if (defaultValue === undefined || !datasourceStates.formBased) {
    return datasourceStates;
  }

  const formBased = applyDateHistogramEmptyRowsDefaultToLayerState(
    datasourceStates.formBased,
    defaultValue,
    options
  );

  if (formBased === datasourceStates.formBased) {
    return datasourceStates;
  }

  return {
    ...datasourceStates,
    formBased,
  } as T;
};
