/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLastValue, isEmptyValue, EMPTY_VALUE } from './last_value_utils';
import { clone } from 'lodash';
import { PanelDataArray } from './types/vis_data';

describe('getLastValue(data)', () => {
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

  test("should return empty value (null), if second array is empty or it's last element is null/undefined (default)", () => {
    expect(
      getLastValue([
        [1, null],
        [2, null],
      ])
    ).toBe(EMPTY_VALUE);

    expect(
      getLastValue([
        [1, null],
        [2, undefined],
      ] as PanelDataArray[])
    ).toBe(EMPTY_VALUE);
  });
});

describe('isEmptyValue(value)', () => {
  test('should return true if is equal to the empty value', () => {
    // if empty value will change, no need to rewrite test for passing it.
    const emptyValue =
      typeof EMPTY_VALUE === 'object' && EMPTY_VALUE != null ? clone(EMPTY_VALUE) : EMPTY_VALUE;
    expect(isEmptyValue(emptyValue)).toBe(true);
  });

  test('should return the last value', () => {
    const notEmptyValue = [...Array(10).keys()];
    expect(isEmptyValue(notEmptyValue)).toBe(false);
  });
});
