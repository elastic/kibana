/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    expect(getDefaultSort(stubDataView, 'desc', false, false)).toEqual([['@timestamp', 'desc']]);
    expect(getDefaultSort(stubDataView, 'asc', false, false)).toEqual([['@timestamp', 'asc']]);
    expect(getDefaultSort(stubDataView, 'asc', false, true)).toEqual([]);
  });

  test('should return default sort for an data view without timeFieldName', function () {
    expect(getDefaultSort(stubDataViewWithoutTimeField, 'desc', false, false)).toEqual([]);
    expect(getDefaultSort(stubDataViewWithoutTimeField, 'asc', false, false)).toEqual([]);
    expect(getDefaultSort(stubDataViewWithoutTimeField, 'asc', false, true)).toEqual([]);
  });

  test('should return empty sort for data view when time column is hidden', function () {
    expect(getDefaultSort(stubDataView, 'desc', true, false)).toEqual([]);
    expect(getDefaultSort(stubDataView, 'asc', true, false)).toEqual([]);
    expect(getDefaultSort(stubDataView, 'asc', true, true)).toEqual([]);
  });
});
