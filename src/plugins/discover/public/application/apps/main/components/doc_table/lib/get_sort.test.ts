/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSort, getSortArray } from './get_sort';
import {
  stubIndexPattern,
  stubIndexPatternWithoutTimeField,
} from '../../../../../../../../data/common/stubs';

describe('docTable', function () {
  describe('getSort function', function () {
    test('should be a function', function () {
      expect(typeof getSort === 'function').toBeTruthy();
    });

    test('should return an array of objects', function () {
      expect(getSort([['bytes', 'desc']], stubIndexPattern)).toEqual([{ bytes: 'desc' }]);
      expect(getSort([['bytes', 'desc']], stubIndexPatternWithoutTimeField)).toEqual([
        { bytes: 'desc' },
      ]);
    });

    test('should passthrough arrays of objects', () => {
      expect(getSort([{ bytes: 'desc' }], stubIndexPattern)).toEqual([{ bytes: 'desc' }]);
    });

    test('should return an empty array when passed an unsortable field', function () {
      expect(getSort([['non-sortable', 'asc']], stubIndexPattern)).toEqual([]);
      expect(getSort([['lol_nope', 'asc']], stubIndexPattern)).toEqual([]);

      expect(getSort([['non-sortable', 'asc']], stubIndexPatternWithoutTimeField)).toEqual([]);
    });

    test('should return an empty array ', function () {
      expect(getSort([], stubIndexPattern)).toEqual([]);
      expect(getSort([['foo', 'bar']], stubIndexPattern)).toEqual([]);
      expect(getSort([{ foo: 'bar' }], stubIndexPattern)).toEqual([]);
    });

    test('should convert a legacy sort to an array of objects', function () {
      expect(getSort(['foo', 'desc'], stubIndexPattern)).toEqual([{ foo: 'desc' }]);
      expect(getSort(['foo', 'asc'], stubIndexPattern)).toEqual([{ foo: 'asc' }]);
    });
  });

  describe('getSortArray function', function () {
    test('should have an array method', function () {
      expect(getSortArray).toBeInstanceOf(Function);
    });

    test('should return an array of arrays for sortable fields', function () {
      expect(getSortArray([['bytes', 'desc']], stubIndexPattern)).toEqual([['bytes', 'desc']]);
    });

    test('should return an array of arrays from an array of elasticsearch sort objects', function () {
      expect(getSortArray([{ bytes: 'desc' }], stubIndexPattern)).toEqual([['bytes', 'desc']]);
    });

    test('should sort by an empty array when an unsortable field is given', function () {
      expect(getSortArray([{ 'non-sortable': 'asc' }], stubIndexPattern)).toEqual([]);
      expect(getSortArray([{ lol_nope: 'asc' }], stubIndexPattern)).toEqual([]);

      expect(getSortArray([{ 'non-sortable': 'asc' }], stubIndexPatternWithoutTimeField)).toEqual(
        []
      );
    });

    test('should return an empty array when passed an empty sort array', () => {
      expect(getSortArray([], stubIndexPattern)).toEqual([]);

      expect(getSortArray([], stubIndexPatternWithoutTimeField)).toEqual([]);
    });
  });
});
