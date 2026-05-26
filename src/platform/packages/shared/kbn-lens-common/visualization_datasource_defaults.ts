/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DateHistogramIndexPatternColumn,
  RangeIndexPatternColumn,
  TermsIndexPatternColumn,
} from './datasources/operations';
import type { GenericIndexPatternColumn } from './datasources/types';
import { LENS_DATATABLE_ID } from './visualizations/datatable/constants';
import { LENS_HEATMAP_ID } from './visualizations/heatmap/constants';
import { LENS_METRIC_ID } from './visualizations/metric/constants';
import { isPartitionChartTypeWithEmptyRowsDefault } from './visualizations/partition/utils';
import { isBarSeriesType } from './visualizations/xy/utils';

const XY_VISUALIZATION_ID = 'lnsXY';
const PARTITION_VISUALIZATION_ID = 'lnsPie';
const TAGCLOUD_VISUALIZATION_ID = 'lnsTagcloud';

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

export interface ApplyDatasourceDefaultsOptions {
  overwriteExisting?: boolean;
}

export interface VisualizationDatasourceDefaults {
  operationParams?: {
    date_histogram?: Partial<DateHistogramIndexPatternColumn['params']>;
    range?: Partial<RangeIndexPatternColumn['params']>;
    terms?: Partial<TermsIndexPatternColumn['params']>;
  };
}

const EMPTY_ROWS_DEFAULT_OFF: VisualizationDatasourceDefaults = {
  operationParams: {
    date_histogram: {
      includeEmptyRows: false,
    },
  },
};

const EMPTY_ROWS_DEFAULT_ON: VisualizationDatasourceDefaults = {
  operationParams: {
    date_histogram: {
      includeEmptyRows: true,
    },
  },
};

/**
 * This module owns visualization-specific datasource defaults for form-based Lens layers.
 * It resolves defaults from visualization state, then applies them either while a dimension
 * is being created or in bulk when a caller needs to normalize datasource state.
 */

const isDateHistogramColumn = (
  column: GenericIndexPatternColumn
): column is DateHistogramIndexPatternColumn => column.operationType === 'date_histogram';

const isRangeColumn = (column: GenericIndexPatternColumn): column is RangeIndexPatternColumn =>
  column.operationType === 'range';

const isTermsColumn = (column: GenericIndexPatternColumn): column is TermsIndexPatternColumn =>
  column.operationType === 'terms';

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

const mergeVisualizationDatasourceDefaults = (
  ...defaults: Array<VisualizationDatasourceDefaults | undefined>
) => {
  let hasChanges = false;
  let mergedOperationParams: VisualizationDatasourceDefaults['operationParams'];

  for (const scopedDefaults of defaults) {
    if (!scopedDefaults?.operationParams) {
      continue;
    }

    hasChanges = true;
    mergedOperationParams = {
      ...mergedOperationParams,
      ...(scopedDefaults.operationParams.date_histogram
        ? {
            date_histogram: {
              ...mergedOperationParams?.date_histogram,
              ...scopedDefaults.operationParams.date_histogram,
            },
          }
        : {}),
      ...(scopedDefaults.operationParams.range
        ? {
            range: {
              ...mergedOperationParams?.range,
              ...scopedDefaults.operationParams.range,
            },
          }
        : {}),
      ...(scopedDefaults.operationParams.terms
        ? {
            terms: {
              ...mergedOperationParams?.terms,
              ...scopedDefaults.operationParams.terms,
            },
          }
        : {}),
    };
  }

  return hasChanges ? { operationParams: mergedOperationParams } : undefined;
};

const getGlobalDatasourceDefaults = (): VisualizationDatasourceDefaults | undefined => undefined;

const getChartSpecificDatasourceDefaults = (
  visualizationType: string | null | undefined,
  visualizationSubtype?: string | null
) => {
  switch (visualizationType) {
    case XY_VISUALIZATION_ID:
      return isBarSeriesType(visualizationSubtype) ? EMPTY_ROWS_DEFAULT_OFF : undefined;

    case PARTITION_VISUALIZATION_ID:
      return isPartitionChartTypeWithEmptyRowsDefault(visualizationSubtype)
        ? EMPTY_ROWS_DEFAULT_OFF
        : undefined;

    case LENS_HEATMAP_ID:
    case LENS_METRIC_ID:
    case TAGCLOUD_VISUALIZATION_ID:
      return EMPTY_ROWS_DEFAULT_OFF;

    case LENS_DATATABLE_ID:
      return EMPTY_ROWS_DEFAULT_ON;

    default:
      return;
  }
};

export const getVisualizationDatasourceDefaults = (
  visualizationType: string | null | undefined,
  visualizationSubtype?: string | null
) =>
  mergeVisualizationDatasourceDefaults(
    getGlobalDatasourceDefaults(),
    getChartSpecificDatasourceDefaults(visualizationType, visualizationSubtype)
  );

export const getVisualizationDatasourceDefaultsForVisualizationState = (
  visualizationType: string | null | undefined,
  visualizationState: unknown
) => {
  if (visualizationType === XY_VISUALIZATION_ID) {
    return getVisualizationDatasourceDefaults(
      visualizationType,
      getXYSeriesTypeFromState(visualizationState)
    );
  }

  if (visualizationType === PARTITION_VISUALIZATION_ID) {
    return getVisualizationDatasourceDefaults(
      visualizationType,
      getPartitionShapeFromState(visualizationState)
    );
  }

  return getVisualizationDatasourceDefaults(visualizationType);
};

const applyParamDefaults = <T extends object>(
  params: Partial<T> | undefined,
  defaultParams: Partial<T> | undefined,
  { overwriteExisting = false }: ApplyDatasourceDefaultsOptions = {}
) => {
  if (!defaultParams) {
    return params;
  }

  let hasChanges = false;
  let nextParams = params;

  for (const [key, defaultValue] of Object.entries(defaultParams)) {
    if (defaultValue === undefined) {
      continue;
    }

    const typedKey = key as keyof T;
    const currentValue = params?.[typedKey];

    if (!overwriteExisting && currentValue !== undefined) {
      continue;
    }

    if (currentValue === defaultValue) {
      continue;
    }

    if (!nextParams) {
      nextParams = {} as Partial<T>;
    }

    nextParams = {
      ...nextParams,
      [typedKey]: defaultValue,
    };
    hasChanges = true;
  }

  return hasChanges ? nextParams : params;
};

export const applyDatasourceDefaultsToColumnParams = (
  operationType: string,
  columnParams: Record<string, unknown> | undefined,
  defaults: VisualizationDatasourceDefaults | undefined,
  options?: ApplyDatasourceDefaultsOptions
): Record<string, unknown> | undefined => {
  switch (operationType) {
    case 'date_histogram':
      return applyParamDefaults<DateHistogramIndexPatternColumn['params']>(
        columnParams,
        defaults?.operationParams?.date_histogram,
        options
      );

    case 'range':
      return applyParamDefaults<RangeIndexPatternColumn['params']>(
        columnParams,
        defaults?.operationParams?.range,
        options
      );

    case 'terms':
      return applyParamDefaults<TermsIndexPatternColumn['params']>(
        columnParams,
        defaults?.operationParams?.terms,
        options
      );

    default:
      return columnParams;
  }
};

const applyDatasourceDefaultsToColumn = (
  column: GenericIndexPatternColumn,
  defaults: VisualizationDatasourceDefaults | undefined,
  options?: ApplyDatasourceDefaultsOptions
) => {
  if (isDateHistogramColumn(column)) {
    const params = applyParamDefaults<DateHistogramIndexPatternColumn['params']>(
      column.params,
      defaults?.operationParams?.date_histogram,
      options
    );

    return params === column.params ? column : { ...column, params };
  }

  if (isRangeColumn(column)) {
    const params = applyParamDefaults<RangeIndexPatternColumn['params']>(
      column.params,
      defaults?.operationParams?.range,
      options
    );

    return params === column.params ? column : { ...column, params };
  }

  if (isTermsColumn(column)) {
    const params = applyParamDefaults<TermsIndexPatternColumn['params']>(
      column.params,
      defaults?.operationParams?.terms,
      options
    );

    return params === column.params ? column : { ...column, params };
  }

  return column;
};

export const applyDatasourceDefaultsToDatasourceState = <T>(
  datasourceState: T,
  defaults: VisualizationDatasourceDefaults | undefined,
  options?: ApplyDatasourceDefaultsOptions
) => {
  if (!defaults?.operationParams || !isFormBasedLayerStateLike(datasourceState)) {
    return datasourceState;
  }

  let hasChanges = false;
  const layers = Object.fromEntries(
    Object.entries(datasourceState.layers).map(([layerId, layer]) => {
      let layerHasChanges = false;
      const columns = Object.fromEntries(
        Object.entries(layer.columns).map(([columnId, column]) => {
          const nextColumn = applyDatasourceDefaultsToColumn(column, defaults, options);

          if (nextColumn !== column) {
            hasChanges = true;
            layerHasChanges = true;
          }

          return [columnId, nextColumn];
        })
      );

      return [layerId, layerHasChanges ? { ...layer, columns } : layer];
    })
  );

  return hasChanges ? ({ ...datasourceState, layers } as T) : datasourceState;
};

export const applyDatasourceDefaultsToDatasourceStates = <T extends DatasourceStatesLike>(
  datasourceStates: T,
  defaults: VisualizationDatasourceDefaults | undefined,
  options?: ApplyDatasourceDefaultsOptions
): T => {
  if (!defaults?.operationParams || !datasourceStates.formBased) {
    return datasourceStates;
  }

  const formBased = applyDatasourceDefaultsToDatasourceState(
    datasourceStates.formBased,
    defaults,
    options
  );

  if (formBased === datasourceStates.formBased) {
    return datasourceStates;
  }

  return {
    ...datasourceStates,
    formBased,
  };
};
