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
import type { LensPartitionVisualizationState } from './visualizations/partition/types';
import { isPartitionChartTypeWithEmptyRowsDefault } from './visualizations/partition/utils';
import type { XYVisualizationState } from './visualizations/xy/types';
import { isBarSeriesType } from './visualizations/xy/utils';

interface FormBasedStateLike {
  layers: Record<
    string,
    {
      columns: Record<string, GenericIndexPatternColumn>;
    }
  >;
}

interface DatasourceStatesLike {
  formBased?: FormBasedStateLike;
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

/**
 * This module owns visualization-specific datasource defaults for form-based Lens layers.
 * It resolves defaults from visualization state, then applies them either while a dimension
 * is being created or in bulk when a caller needs to normalize datasource state.
 */

const isFormBasedLayerStateLike = (
  datasourceState: unknown
): datasourceState is FormBasedStateLike => {
  if (!datasourceState || typeof datasourceState !== 'object') {
    return false;
  }

  const { layers } = datasourceState as FormBasedStateLike;
  return Boolean(layers && typeof layers === 'object');
};

const getXYSeriesTypeFromState = (visualizationState: unknown) => {
  if (!visualizationState || typeof visualizationState !== 'object') {
    return;
  }

  const { preferredSeriesType } = visualizationState as Partial<XYVisualizationState>;
  return typeof preferredSeriesType === 'string' ? preferredSeriesType : undefined;
};

const getPartitionShapeFromState = (visualizationState: unknown) => {
  if (!visualizationState || typeof visualizationState !== 'object') {
    return;
  }

  const { shape } = visualizationState as Partial<LensPartitionVisualizationState>;
  return typeof shape === 'string' ? shape : undefined;
};

const createDateHistogramDefaults = (
  includeEmptyRows: boolean
): VisualizationDatasourceDefaults => ({
  operationParams: {
    date_histogram: {
      includeEmptyRows,
    },
  },
});

export const getVisualizationDatasourceDefaults = (
  visualizationType: string | null | undefined,
  visualizationSubtype?: string | null
) => {
  switch (visualizationType) {
    case 'lnsXY':
      return isBarSeriesType(visualizationSubtype) ? createDateHistogramDefaults(false) : undefined;

    case 'lnsPie':
      return isPartitionChartTypeWithEmptyRowsDefault(visualizationSubtype)
        ? createDateHistogramDefaults(false)
        : undefined;

    case LENS_HEATMAP_ID:
    case LENS_METRIC_ID:
    case 'lnsTagcloud':
      return createDateHistogramDefaults(false);

    case LENS_DATATABLE_ID:
      return createDateHistogramDefaults(true);

    default:
      return;
  }
};

export const getVisualizationDatasourceDefaultsForVisualizationState = (
  visualizationType: string | null | undefined,
  visualizationState: unknown
) => {
  if (visualizationType === 'lnsXY') {
    return getVisualizationDatasourceDefaults(
      visualizationType,
      getXYSeriesTypeFromState(visualizationState)
    );
  }

  if (visualizationType === 'lnsPie') {
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
  const currentParams = 'params' in column ? column.params : undefined;
  const nextParams = applyDatasourceDefaultsToColumnParams(
    column.operationType,
    currentParams,
    defaults,
    options
  );

  return nextParams === currentParams ? column : { ...column, params: nextParams };
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
