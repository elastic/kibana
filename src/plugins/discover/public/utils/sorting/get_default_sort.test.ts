/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDefaultSort } from './get_default_sort';
import {
  stubDataView,
  stubDataViewWithoutTimeField,
} from '@kbn/data-views-plugin/common/data_view.stub';

describe('getDefaultSort function', function () {
  test('should be a function', function () {
    expect(typeof getDefaultSort === 'function').toBeTruthy();
  });

  test('should return default sort for an data view with timeFieldName', function () {
    expect(getDefaultSort(stubDataView, 'desc', false)).toEqual([['@timestamp', 'desc']]);
    expect(getDefaultSort(stubDataView, 'asc', false)).toEqual([['@timestamp', 'asc']]);
  });

  test('should return default sort for an data view without timeFieldName', function () {
    expect(getDefaultSort(stubDataViewWithoutTimeField, 'desc', false)).toEqual([]);
    expect(getDefaultSort(stubDataViewWithoutTimeField, 'asc', false)).toEqual([]);
  });

  test('should return empty sort for data view when time column is hidden', function () {
    expect(getDefaultSort(stubDataView, 'desc', true)).toEqual([]);
    expect(getDefaultSort(stubDataView, 'asc', true)).toEqual([]);
  });
});
