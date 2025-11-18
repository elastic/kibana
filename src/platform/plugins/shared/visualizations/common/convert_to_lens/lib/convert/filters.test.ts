/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggParamsFilters } from '@kbn/data-plugin/common';
import { convertToFiltersColumn } from './filters';

describe('convertToFiltersColumn', () => {
  const aggId = `some-id`;
  const timeShift = '1h';
  const filters = [{ input: { query: 'some other query', language: 'lucene' }, label: 'split' }];
  const aggParams: AggParamsFilters = {
    filters,
  };

  it('should return filters column if filters are provided', () => {
    const expected = {
      operationType: 'filters',
      dataType: 'string',
      isBucketed: true,
      isSplit: false,
      timeShift: undefined,
      meta: { aggId },
      params: { filters: aggParams.filters },
    };
    expect(convertToFiltersColumn(aggId, aggParams)).toEqual(expect.objectContaining(expected));
  });

  it('should return null if filters are not provided', () => {
    expect(convertToFiltersColumn(aggId, {})).toBeNull();
  });

  it('should return filters column with isSplit and timeShift if specified', () => {
    const expected = {
      operationType: 'filters',
      dataType: 'string',
      isBucketed: true,
      isSplit: true,
      timeShift,
      meta: { aggId },
      params: { filters: aggParams.filters },
    };
    expect(convertToFiltersColumn(aggId, { ...aggParams, timeShift }, true)).toEqual(
      expect.objectContaining(expected)
    );
  });
});
