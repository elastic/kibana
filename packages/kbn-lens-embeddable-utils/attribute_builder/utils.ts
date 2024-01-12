/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  DateHistogramIndexPatternColumn,
  PersistedIndexPatternLayer,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { SavedObjectReference } from '@kbn/core/server';

export const DEFAULT_LAYER_ID = 'layer';
export const DEFAULT_AD_HOC_DATA_VIEW_ID = 'infra_lens_ad_hoc_default';

const DEFAULT_BREAKDOWN_SIZE = 10;

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export type DateHistogramColumnParams = DateHistogramIndexPatternColumn['params'];

export type TopValuesColumnParams = Pick<
  TermsIndexPatternColumn['params'],
  'size' | 'orderDirection' | 'orderBy' | 'secondaryFields' | 'accuracyMode'
>;

export const getHistogramColumn = ({
  columnName,
  options,
}: {
  columnName: string;
  options?: Partial<
    Pick<DateHistogramIndexPatternColumn, 'sourceField'> & {
      params: Partial<DateHistogramColumnParams>;
    }
  >;
}) => {
  const { interval = 'auto', ...rest } = options?.params ?? {};
  return {
    [columnName]: {
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      scale: 'interval',
      sourceField: options?.sourceField ?? '@timestamp',
      params: { interval, ...rest },
    } as DateHistogramIndexPatternColumn,
  };
};

export const getTopValuesColumn = ({
  columnName,
  field,
  options,
}: {
  columnName: string;
  field: string;
  options?: Partial<TopValuesColumnParams>;
}): PersistedIndexPatternLayer['columns'] => {
  const { size = DEFAULT_BREAKDOWN_SIZE, ...params } = options ?? {};
  return {
    [columnName]: {
      label: `Top ${size} values of ${field}`,
      dataType: 'string',
      operationType: 'terms',
      scale: 'ordinal',
      sourceField: field,
      isBucketed: true,
      params: {
        size,
        orderBy: {
          type: 'alphabetical',
          fallback: false,
        },
        orderDirection: 'asc',
        otherBucket: false,
        missingBucket: false,
        parentFormat: {
          id: 'terms',
        },
        include: [],
        exclude: [],
        includeIsRegex: false,
        excludeIsRegex: false,
        ...params,
      },
    } as TermsIndexPatternColumn,
  };
};

export const getDefaultReferences = (
  dataView: DataView,
  dataLayerId: string
): SavedObjectReference[] => {
  return [
    {
      type: 'index-pattern',
      id: dataView.id ?? DEFAULT_AD_HOC_DATA_VIEW_ID,
      name: `indexpattern-datasource-layer-${dataLayerId}`,
    },
  ];
};

export const getAdhocDataView = (dataViewSpec: DataViewSpec): Record<string, DataViewSpec> => {
  return {
    [dataViewSpec.id ?? DEFAULT_AD_HOC_DATA_VIEW_ID]: {
      ...dataViewSpec,
    },
  };
};
