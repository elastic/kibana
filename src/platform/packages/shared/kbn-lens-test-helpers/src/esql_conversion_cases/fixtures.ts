/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlConversionCase, EsqlConversionDataset, EsqlConversionDatasetId } from './types';

export const ESQL_CONVERSION_DATASETS: Record<EsqlConversionDatasetId, EsqlConversionDataset> = {
  ecommerce: {
    id: 'ecommerce',
    index: 'ft_ecommerce',
    timeField: 'order_date',
    fieldTypes: {
      order_date: 'date',
      taxful_total_price: 'number',
      total_quantity: 'number',
      'products.base_price': 'number',
      customer_id: 'string',
      'category.keyword': 'string',
    },
  },
  logs: {
    id: 'logs',
    index: 'kibana_sample_data_logstsdb',
    timeField: 'timestamp',
    fieldTypes: {
      timestamp: 'date',
      bytes: 'number',
      'host.keyword': 'string',
      'machine.os.keyword': 'string',
    },
  },
};

export const ESQL_CONVERSION_DATE_RANGE = {
  fromDate: '2023-04-16T00:00:00.000Z',
  toDate: '2023-06-16T00:00:00.000Z',
} as const;

export const ESQL_CONVERSION_NOW = new Date('2023-06-16T00:00:00.000Z');

export const createEsqlConversionUiSettings = () => ({
  get: <T = unknown>(key: string): T => {
    const settings: Record<string, unknown> = {
      dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
      'dateFormat:scaled': [[]],
      'dateFormat:tz': 'UTC',
      'histogram:barTarget': 50,
      'histogram:maxBars': 100,
    };
    return settings[key] as T;
  },
});

export const createEsqlConversionIndexPattern = (dataset: EsqlConversionDataset) => ({
  id: dataset.index,
  title: dataset.index,
  timeFieldName: dataset.timeField,
  getFieldByName: (fieldName: string) => {
    const type = dataset.fieldTypes[fieldName];
    if (!type) return undefined;
    return { name: fieldName, displayName: fieldName, type };
  },
  getFormatterForField: () => ({ convertToText: (value: unknown) => String(value) }),
});

export const createEsqlConversionInput = (conversionCase: EsqlConversionCase) => {
  const columns = conversionCase.columns;
  const baseUiSettings = createEsqlConversionUiSettings();
  const overrides = conversionCase.uiSettingsOverrides ?? {};

  return {
    esAggEntries: conversionCase.columnOrder.map(
      (columnId) => [columnId, columns[columnId]] as const
    ),
    layer: {
      indexPatternId: conversionCase.dataset.index,
      columns,
      columnOrder: [...conversionCase.columnOrder],
    },
    indexPattern: createEsqlConversionIndexPattern(conversionCase.dataset),
    uiSettings: {
      get: <T = unknown>(key: string): T =>
        key in overrides ? (overrides[key] as T) : baseUiSettings.get<T>(key),
    },
    dateRange: conversionCase.omitDateRange
      ? { fromDate: undefined, toDate: undefined }
      : conversionCase.dateRangeOverride ?? ESQL_CONVERSION_DATE_RANGE,
    now: ESQL_CONVERSION_NOW,
    columnRoles: conversionCase.columnRoles ? { ...conversionCase.columnRoles } : undefined,
  };
};

export const createEsqlConversionCaseContext = () => {
  const ecommerce = ESQL_CONVERSION_DATASETS.ecommerce;
  const logs = ESQL_CONVERSION_DATASETS.logs;
  const ecommerceWithoutTimeField: EsqlConversionDataset = {
    ...ecommerce,
    timeField: undefined,
  };

  return {
    ecommerce,
    ecommerceWithoutTimeField,
    logs,
    ecommerceFrom: `FROM ${ecommerce.index}`,
    ecommerceWhere: `WHERE ${ecommerce.timeField} >= ?_tstart AND ${ecommerce.timeField} <= ?_tend`,
    logsFrom: `FROM ${logs.index}`,
    logsWhere: `WHERE ${logs.timeField} >= ?_tstart AND ${logs.timeField} <= ?_tend`,
  };
};
