/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSortForSearchSource } from './get_sort_for_search_source';
import { SortOrder } from '../components/table_header/helpers';
import { stubDataView, stubDataViewWithoutTimeField } from '@kbn/data-plugin/common/stubs';

describe('getSortForSearchSource function', function () {
  test('should be a function', function () {
    expect(typeof getSortForSearchSource === 'function').toBeTruthy();
  });

  test('should return an object to use for searchSource when columns are given', function () {
    const cols = [['bytes', 'desc']] as SortOrder[];
    expect(getSortForSearchSource(cols, stubDataView)).toEqual([{ bytes: 'desc' }]);
    expect(getSortForSearchSource(cols, stubDataView, 'asc')).toEqual([{ bytes: 'desc' }]);

    expect(getSortForSearchSource(cols, stubDataViewWithoutTimeField)).toEqual([{ bytes: 'desc' }]);
    expect(getSortForSearchSource(cols, stubDataViewWithoutTimeField, 'asc')).toEqual([
      { bytes: 'desc' },
    ]);
  });

  test('should return an object to use for searchSource when no columns are given', function () {
    const cols = [] as SortOrder[];
    expect(getSortForSearchSource(cols, stubDataView)).toEqual([{ _doc: 'desc' }]);
    expect(getSortForSearchSource(cols, stubDataView, 'asc')).toEqual([{ _doc: 'asc' }]);

    expect(getSortForSearchSource(cols, stubDataViewWithoutTimeField)).toEqual([
      { _score: 'desc' },
    ]);
    expect(getSortForSearchSource(cols, stubDataViewWithoutTimeField, 'asc')).toEqual([
      { _score: 'asc' },
    ]);
  });
});
