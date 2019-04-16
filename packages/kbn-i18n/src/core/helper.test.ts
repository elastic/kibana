/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { hasValues, isObject, isString, mergeAll, unique } from './helper';

describe('I18n helper', () => {
  describe('isString', () => {
    test('should return true for string literal', () => {
      expect(isString('test')).toBe(true);
    });

    test('should return false for string object', () => {
      // eslint-disable-next-line no-new-wrappers
      expect(isString(new String('test'))).toBe(false);
    });

    test('should return false for non-string values', () => {
      expect(isString(undefined)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(0)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString({})).toBe(false);
    });
  });

  describe('isObject', () => {
    test('should return true for object literal', () => {
      expect(isObject({})).toBe(true);
    });

    test('should return true for array literal', () => {
      expect(isObject([])).toBe(true);
    });

    test('should return false for primitives', () => {
      expect(isObject(undefined)).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(0)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject('test')).toBe(false);
    });
  });

  describe('hasValues', () => {
    test('should return false for empty object', () => {
      expect(hasValues({})).toBe(false);
    });

    test('should return true for non-empty object', () => {
      expect(hasValues({ foo: 'bar' })).toBe(true);
    });

    test('should throw error for null and undefined', () => {
      expect(() => hasValues(undefined)).toThrow();
      expect(() => hasValues(null)).toThrow();
    });

    test('should return false for number and boolean', () => {
      expect(hasValues(true)).toBe(false);
      expect(hasValues(0)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(hasValues('')).toBe(false);
    });

    test('should return true for non-empty string', () => {
      expect(hasValues('test')).toBe(true);
    });

    test('should return false for empty array', () => {
      expect(hasValues([])).toBe(false);
    });

    test('should return true for non-empty array', () => {
      expect(hasValues([1, 2, 3])).toBe(true);
    });
  });

  describe('unique', () => {
    test('should return an array with unique values', () => {
      expect(unique([1, 2, 7, 2, 6, 7, 1])).toEqual([1, 2, 7, 6]);
    });

    test('should create a new array', () => {
      const value = [1, 2, 3];

      expect(unique(value)).toEqual(value);
      expect(unique(value)).not.toBe(value);
    });

    test('should filter unique values only by reference', () => {
      expect(unique([{ foo: 'bar' }, { foo: 'bar' }])).toEqual([{ foo: 'bar' }, { foo: 'bar' }]);

      const value = { foo: 'bar' };

      expect(unique([value, value])).toEqual([value]);
    });
  });

  describe('mergeAll', () => {
    test('should throw error for empty arguments', () => {
      expect(() => mergeAll()).toThrow();
    });

    test('should merge only objects', () => {
      expect(mergeAll(undefined, null, true, 5, '5', { foo: 'bar' })).toEqual({
        foo: 'bar',
      });
    });

    test('should return the only argument as is', () => {
      const value = { foo: 'bar' };

      expect(mergeAll(value)).toBe(value);
    });

    test('should return a deep merge of 2 objects nested objects', () => {
      expect(
        mergeAll(
          {
            foo: { bar: 3 },
            array: [
              {
                does: 'work',
                too: [1, 2, 3],
              },
            ],
          },
          {
            foo: { baz: 4 },
            quux: 5,
            array: [
              {
                does: 'work',
                too: [4, 5, 6],
              },
              {
                really: 'yes',
              },
            ],
          }
        )
      ).toEqual({
        foo: {
          bar: 3,
          baz: 4,
        },
        array: [
          {
            does: 'work',
            too: [4, 5, 6],
          },
          {
            really: 'yes',
          },
        ],
        quux: 5,
      });
    });

    test('should override arrays', () => {
      expect(mergeAll({ foo: [1, 2] }, { foo: [3, 4] })).toEqual({
        foo: [3, 4],
      });
    });

    test('should merge any number of objects', () => {
      expect(mergeAll({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({
        a: 1,
        b: 2,
        c: 3,
      });
      expect(mergeAll({ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 })).toEqual({
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      });
    });
  });
});
