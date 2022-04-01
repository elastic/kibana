/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSort, getSortArray } from './get_sort';
import {
  stubDataView,
  stubDataViewWithoutTimeField,
} from '../../../../../data_views/common/data_view.stub';

describe('docTable', function () {
  describe('getSort function', function () {
    test('should be a function', function () {
      expect(typeof getSort === 'function').toBeTruthy();
    });

    test('should return an array of objects', function () {
      expect(getSort([['bytes', 'desc']], stubDataView)).toEqual([{ bytes: 'desc' }]);
      expect(getSort([['bytes', 'desc']], stubDataViewWithoutTimeField)).toEqual([
        { bytes: 'desc' },
      ]);
    });

    test('should passthrough arrays of objects', () => {
      expect(getSort([{ bytes: 'desc' }], stubDataView)).toEqual([{ bytes: 'desc' }]);
    });

    test('should return an empty array when passed an unsortable field', function () {
      expect(getSort([['non-sortable', 'asc']], stubDataView)).toEqual([]);
      expect(getSort([['lol_nope', 'asc']], stubDataView)).toEqual([]);

      expect(getSort([['non-sortable', 'asc']], stubDataViewWithoutTimeField)).toEqual([]);
    });

    test('should return an empty array ', function () {
      expect(getSort([], stubDataView)).toEqual([]);
      expect(getSort([['foo', 'bar']], stubDataView)).toEqual([]);
      expect(getSort([{ foo: 'bar' }], stubDataView)).toEqual([]);
    });

    test('should convert a legacy sort to an array of objects', function () {
      expect(getSort(['foo', 'desc'], stubDataView)).toEqual([{ foo: 'desc' }]);
      expect(getSort(['foo', 'asc'], stubDataView)).toEqual([{ foo: 'asc' }]);
    });
  });

  describe('getSortArray function', function () {
    test('should have an array method', function () {
      expect(getSortArray).toBeInstanceOf(Function);
    });

    test('should return an array of arrays for sortable fields', function () {
      expect(getSortArray([['bytes', 'desc']], stubDataView)).toEqual([['bytes', 'desc']]);
    });

    test('should return an array of arrays from an array of elasticsearch sort objects', function () {
      expect(getSortArray([{ bytes: 'desc' }], stubDataView)).toEqual([['bytes', 'desc']]);
    });

    test('should sort by an empty array when an unsortable field is given', function () {
      expect(getSortArray([{ 'non-sortable': 'asc' }], stubDataView)).toEqual([]);
      expect(getSortArray([{ lol_nope: 'asc' }], stubDataView)).toEqual([]);

      expect(getSortArray([{ 'non-sortable': 'asc' }], stubDataViewWithoutTimeField)).toEqual([]);
    });

    test('should return an empty array when passed an empty sort array', () => {
      expect(getSortArray([], stubDataView)).toEqual([]);

      expect(getSortArray([], stubDataViewWithoutTimeField)).toEqual([]);
    });
  });
});
