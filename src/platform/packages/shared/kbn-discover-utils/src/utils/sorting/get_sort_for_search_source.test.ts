/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortOrder } from './get_sort';
import { getSortForSearchSource } from './get_sort_for_search_source';
import {
  stubDataView,
  stubDataViewWithoutTimeField,
  stubRollupDataView,
} from '@kbn/data-plugin/common/stubs';

describe('getSortForSearchSource function', function () {
  test('should be a function', function () {
    expect(typeof getSortForSearchSource === 'function').toBeTruthy();
  });

  test('should return an object to use for searchSource when columns are given', function () {
    const cols = [['bytes', 'desc']] as SortOrder[];
    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataView,
        defaultSortDir: 'desc',
        includeTieBreaker: true,
      })
    ).toEqual([{ bytes: 'desc' }, { _doc: 'desc' }]);

    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataView,
        defaultSortDir: 'asc',
        includeTieBreaker: true,
      })
    ).toEqual([{ bytes: 'desc' }, { _doc: 'desc' }]);

    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataView,
        defaultSortDir: 'asc',
      })
    ).toEqual([{ bytes: 'desc' }]);

    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataViewWithoutTimeField,
        defaultSortDir: 'desc',
        includeTieBreaker: true,
      })
    ).toEqual([{ bytes: 'desc' }]);

    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataViewWithoutTimeField,
        defaultSortDir: 'asc',
      })
    ).toEqual([{ bytes: 'desc' }]);
  });

  test('should return an object to use for searchSource when no columns are given', function () {
    const cols = [] as SortOrder[];
    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataView,
        defaultSortDir: 'desc',
      })
    ).toEqual([{ _doc: 'desc' }]);
    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataView,
        defaultSortDir: 'asc',
      })
    ).toEqual([{ _doc: 'asc' }]);

    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataViewWithoutTimeField,
        defaultSortDir: 'desc',
      })
    ).toEqual([{ _score: 'desc' }]);
    expect(
      getSortForSearchSource({
        sort: cols,
        dataView: stubDataViewWithoutTimeField,
        defaultSortDir: 'asc',
      })
    ).toEqual([{ _score: 'asc' }]);
  });

  test('should return an object including format when data view is not a rollup', function () {
    expect(
      getSortForSearchSource({
        sort: [['@timestamp', 'desc']],
        dataView: stubDataView,
        defaultSortDir: 'desc',
      })
    ).toEqual([{ '@timestamp': { format: 'strict_date_optional_time', order: 'desc' } }]);
  });

  test('should not return an object excluding format when data view is a rollup', function () {
    expect(
      getSortForSearchSource({
        sort: [['@timestamp', 'desc']],
        dataView: stubRollupDataView,
        defaultSortDir: 'desc',
      })
    ).toEqual([{ '@timestamp': 'desc' }]);
  });
});
