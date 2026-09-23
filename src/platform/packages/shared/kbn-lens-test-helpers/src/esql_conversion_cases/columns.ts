/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlConversionColumn } from './types';

export const count = (overrides: Partial<EsqlConversionColumn> = {}): EsqlConversionColumn => ({
  operationType: 'count',
  sourceField: '___records___',
  label: 'Count of records',
  dataType: 'number',
  isBucketed: false,
  ...overrides,
});

export const metric = (
  operationType: 'average' | 'max' | 'median' | 'sum' | 'min',
  sourceField: string,
  overrides: Partial<EsqlConversionColumn> = {}
): EsqlConversionColumn => ({
  operationType,
  sourceField,
  label: `${operationType} of ${sourceField}`,
  dataType: 'number',
  isBucketed: false,
  ...overrides,
});

export const terms = (
  sourceField: string,
  params: Record<string, unknown>,
  overrides: Partial<EsqlConversionColumn> = {}
): EsqlConversionColumn => ({
  operationType: 'terms',
  sourceField,
  label: `Top values of ${sourceField}`,
  dataType: 'string',
  isBucketed: true,
  params: {
    size: 5,
    orderBy: { type: 'alphabetical' },
    orderDirection: 'asc',
    otherBucket: false,
    ...params,
  },
  ...overrides,
});

export const staticValue = (value: string): EsqlConversionColumn => ({
  operationType: 'static_value',
  label: `Static value: ${value}`,
  dataType: 'number',
  isBucketed: false,
  params: { value },
});

export const dateHistogram = (
  sourceField: string,
  params: Record<string, unknown>
): EsqlConversionColumn => ({
  operationType: 'date_histogram',
  sourceField,
  label: sourceField,
  dataType: 'date',
  isBucketed: true,
  params,
});
