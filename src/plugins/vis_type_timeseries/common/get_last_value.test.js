/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getLastValue,
  getLastValueOrDefault,
  getLastValueOrZero,
  DEFAULT_VALUE,
} from './get_last_value';

describe('getLastValue(data)', () => {
  test('should return undefined ', () => {
    expect(getLastValue()).toBeUndefined();
  });

  test('should return data, if data is not an array', () => {
    const data = 'foo';
    expect(getLastValue(data)).toBe(data);
  });

  test('should return 0 as a value, when data is not an array', () => {
    expect(getLastValue(0)).toBe(0);
  });

  test('should return the last value', () => {
    const lastVal = 2;
    expect(getLastValue([[1, lastVal]])).toBe(lastVal);
  });

  test('should return 0 as a valid value', () => {
    expect(getLastValue([[0, 0]])).toBe(0);
  });

  test("should return null, if second array is empty or it's last element is null/undefined (default)", () => {
    expect(
      getLastValue([
        [1, null],
        [2, null],
      ])
    ).toBeNull();

    expect(
      getLastValue([
        [1, null],
        [2, undefined],
      ])
    ).toBeNull();
  });
});

describe('getLastValueOrDefault(data)', () => {
  test('should return the default value', () => {
    expect(getLastValueOrDefault()).toBe(DEFAULT_VALUE);
  });

  test('should return the passed default value', () => {
    const defVal = 'DEFAULT';
    expect(getLastValueOrDefault(undefined, defVal)).toBe(defVal);
  });

  test('should return the last value', () => {
    const lastValue = 10;
    const data = [[1, lastValue]];
    expect(getLastValueOrDefault(data)).toBe(lastValue);
  });

  test(`should return default value, if second array is empty or it's last element is null/undefined (default)`, () => {
    const data = [[1, null]];
    expect(getLastValueOrDefault(data)).toBe(DEFAULT_VALUE);
  });

  test(`should return passed default value, if second array is empty or it's last element is null/undefined (default)`, () => {
    let data = [[1, null]];
    const defVal = 'DEFAULT';
    expect(getLastValueOrDefault(data, defVal)).toBe(defVal);

    data = [[1, undefined]];
    expect(getLastValueOrDefault(data, defVal)).toBe(defVal);
  });
});

describe('getLastValueOrZero(data)', () => {
  test('should return 0', () => {
    expect(getLastValueOrZero()).toBe(0);
  });

  test('should return the last value', () => {
    const lastValue = 10;
    const data = [[1, lastValue]];
    expect(getLastValueOrZero(data)).toBe(lastValue);
  });

  test(`should return zero, if second array is empty or it's last element is null/undefined (default)`, () => {
    let data = [[1, null]];
    expect(getLastValueOrZero(data)).toBe(0);

    data = [[1, undefined]];
    expect(getLastValueOrZero(data)).toBe(0);
  });
});
