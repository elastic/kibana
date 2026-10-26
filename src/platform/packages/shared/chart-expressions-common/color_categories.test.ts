/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableRow } from '@kbn/expressions-plugin/common';
import { getColorCategories, getLegacyColorCategories } from './color_categories';
import { MultiFieldKey, RangeKey } from '@kbn/data-plugin/common';

class FakeClass {}

const values = [
  1,
  false,
  true,
  0,
  NaN,
  null,
  undefined,
  '',
  'test-string',
  { test: 'obj' },
  ['array'],
];
const mockRange = new RangeKey({ from: 0, to: 100 });
const mockMultiField = new MultiFieldKey({ key: ['one', 'two'] });
const fakeClass = new FakeClass();
const complex = [mockRange, mockMultiField, fakeClass];

const mockDatatableRows = Array.from({ length: 20 }).map<DatatableRow>((_, i) => ({
  count: i,
  value: values[i % values.length],
  complex: complex[i % complex.length],
}));

describe('Color Categories', () => {
  describe('getColorCategories', () => {
    it('should return no categories when accessor is undefined', () => {
      expect(getColorCategories(mockDatatableRows)).toEqual([]);
    });

    it('should return no categories when accessor is not found', () => {
      expect(getColorCategories(mockDatatableRows, ['N/A'])).toEqual([]);
    });

    it('should return no categories when no rows are defined', () => {
      expect(getColorCategories(undefined, ['extension'])).toEqual([]);
    });

    it('should return all categories from mixed value datatable', () => {
      expect(getColorCategories(mockDatatableRows, ['value'])).toEqual([
        1,
        false,
        true,
        0,
        NaN,
        null,
        '',
        'test-string',
        {
          test: 'obj',
        },
        ['array'],
      ]);
    });

    it('should exclude selected categories from datatable', () => {
      expect(
        getColorCategories(
          mockDatatableRows,
          ['value'],
          [1, false, true, 0, NaN, null, undefined, '']
        )
      ).toEqual([
        'test-string',
        {
          test: 'obj',
        },
        ['array'],
      ]);
    });

    it('should return known serialized categories from datatable', () => {
      expect(getColorCategories(mockDatatableRows, ['complex'], [])).toEqual([
        mockRange.serialize(),
        mockMultiField.serialize(),
        fakeClass,
      ]);
    });
  });

  describe('getLegacyColorCategories', () => {
    it('should return no categories when accessor is undefined', () => {
      expect(getLegacyColorCategories(mockDatatableRows)).toEqual([]);
    });

    it('should return no categories when accessor is not found', () => {
      expect(getLegacyColorCategories(mockDatatableRows, ['N/A'])).toEqual([]);
    });

    it('should return no categories when no rows are defined', () => {
      expect(getLegacyColorCategories(undefined, ['extension'])).toEqual([]);
    });

    it('should return all categories from mixed value datatable', () => {
      expect(getLegacyColorCategories(mockDatatableRows, ['value'])).toEqual([
        '1',
        'false',
        'true',
        '0',
        'NaN',
        '__missing__',
        '',
        'test-string',
        '{"test":"obj"}',
        'array',
      ]);
    });

    it('should exclude selected categories from datatable', () => {
      expect(
        getLegacyColorCategories(
          mockDatatableRows,
          ['value'],
          [1, false, true, 0, NaN, null, undefined, '']
        )
      ).toEqual(['test-string', '{"test":"obj"}', 'array']);
    });

    it('should return known serialized categories from datatable', () => {
      expect(getLegacyColorCategories(mockDatatableRows, ['complex'], [])).toEqual([
        String(mockRange),
        String(mockMultiField),
        JSON.stringify(fakeClass),
      ]);
    });
  });
});
