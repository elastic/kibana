/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexPattern } from '../../types';

export const mockLayer = {
  indexPatternId: 'myIndexPattern',
  columns: {},
  columnOrder: [],
};

export const mockIndexPattern = {
  title: 'myIndexPattern',
  timeFieldName: 'order_date',
  getFieldByName: (field: string) => {
    if (field === 'records') return undefined;
    return { name: field, displayName: field };
  },
  getFormatterForField: () => ({ convertToText: (v: unknown) => v }),
} as unknown as IndexPattern;

export const mockIndexPatternWithoutTimeField = {
  title: 'myIndexPattern',
  getFieldByName: (field: string) => {
    if (field === 'records') return undefined;
    return { name: field, displayName: field };
  },
  getFormatterForField: () => ({ convertToText: (v: unknown) => v }),
} as unknown as IndexPattern;

export const mockDateRange = {
  fromDate: '2021-01-01T00:00:00.000Z',
  toDate: '2021-01-01T23:59:59.999Z',
};
