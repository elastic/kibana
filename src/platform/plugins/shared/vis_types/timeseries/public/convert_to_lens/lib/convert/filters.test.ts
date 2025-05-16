/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FiltersParams } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { createSeries } from '../__mocks__';
import { convertToFiltersColumn, convertToFiltersParams } from './filters';
import { FiltersColumn } from './types';

describe('convertToFiltersParams', () => {
  const filter = { language: 'lucene', query: 'some query' };
  const splitFilters = [
    { filter: { language: 'lucene', query: 'some other query' }, label: 'split' },
  ];

  const series = createSeries();
  const seriesWithFilter = createSeries({
    split_mode: 'filter',
    filter,
  });

  const seriesWithSplitFilters = createSeries({
    split_filters: splitFilters,
  });

  const seriesWithFilterAndSplitFilters = createSeries({
    split_mode: 'filter',
    filter,
    split_filters: splitFilters,
  });

  test.each<[string, Parameters<typeof convertToFiltersParams>, Partial<FiltersParams> | null]>([
    [
      'empty filters if split_mode is not split and no split filters are specified',
      [series],
      { filters: [] },
    ],
    [
      'filters which contains data from filter if split mode is set to filter',
      [seriesWithFilter],
      { filters: [{ input: { query: filter.query, language: filter.language }, label: '' }] },
    ],
    [
      'filters which contains data from filters',
      [seriesWithSplitFilters],
      { filters: [{ input: { language: 'lucene', query: 'some other query' }, label: 'split' }] },
    ],
    [
      'filters which contains data from filters and filter if split mode is set to filter',
      [seriesWithFilterAndSplitFilters],
      {
        filters: [
          { input: { query: filter.query, language: filter.language }, label: '' },
          { input: { language: 'lucene', query: 'some other query' }, label: 'split' },
        ],
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToFiltersParams(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToFiltersParams(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToFiltersParams(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertToFiltersColumn', () => {
  const filter = { language: 'lucene', query: 'some query' };
  const splitFilters = [
    { filter: { language: 'lucene', query: 'some other query' }, label: 'split' },
  ];

  const series = createSeries();
  const seriesWithFilterAndSplitFilters = createSeries({
    split_mode: 'filter',
    filter,
    split_filters: splitFilters,
  });

  test.each<[string, Parameters<typeof convertToFiltersColumn>, Partial<FiltersColumn> | null]>([
    ['null if no filters was collected', [series, false], null],
    [
      'filters column if filters were collected',
      [seriesWithFilterAndSplitFilters, false],
      {
        dataType: 'string',
        isBucketed: true,
        operationType: 'filters',
        params: {
          filters: [
            { input: { language: 'lucene', query: 'some query' }, label: '' },
            { input: { language: 'lucene', query: 'some other query' }, label: 'split' },
          ],
        },
      },
    ],
    [
      'filters column with isSplit=true',
      [seriesWithFilterAndSplitFilters, true],
      {
        dataType: 'string',
        isBucketed: true,
        isSplit: true,
        operationType: 'filters',
        params: {
          filters: [
            { input: { language: 'lucene', query: 'some query' }, label: '' },
            { input: { language: 'lucene', query: 'some other query' }, label: 'split' },
          ],
        },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToFiltersColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToFiltersColumn(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToFiltersColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
