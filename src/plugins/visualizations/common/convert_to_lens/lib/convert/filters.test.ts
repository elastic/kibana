/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsFilters } from '@kbn/data-plugin/common';
import { convertToFiltersColumn } from './filters';
import { FiltersColumn } from './types';

describe('convertToFiltersColumn', () => {
  const aggId = `some-id`;
  const timeShift = '1h';
  const filters = [{ input: { language: 'lucene', query: 'some other query' }, label: 'split' }];
  const aggParams: AggParamsFilters = {
    filters,
  };

  test.each<[string, Parameters<typeof convertToFiltersColumn>, Partial<FiltersColumn> | null]>([
    [
      'filters column if filters are provided',
      [aggId, aggParams],
      {
        dataType: 'string',
        isBucketed: true,
        isSplit: false,
        timeShift: undefined,
        meta: { aggId },
        params: { filters: aggParams.filters! },
      },
    ],
    ['null if filters are not provided', [aggId, {}], null],
    [
      'filters column with isSplit and timeShift if specified',
      [aggId, { ...aggParams, timeShift }, true],
      {
        dataType: 'string',
        isBucketed: true,
        isSplit: true,
        timeShift,
        meta: { aggId },
        params: { filters: aggParams.filters! },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToFiltersColumn(...input)).toBeNull();
    } else {
      expect(convertToFiltersColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
