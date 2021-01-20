/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getLastValue } from './get_last_value';

describe('getLastValue(data)', () => {
  test('should returns data if data is not array', () => {
    expect(getLastValue('foo')).toBe('foo');
  });

  test('should returns the last value', () => {
    expect(getLastValue([[1, 2]])).toBe(2);
  });

  test('should returns the default value ', () => {
    expect(getLastValue()).toBe(0);
  });

  test('should returns 0 if second to last is not defined (default)', () => {
    expect(
      getLastValue([
        [1, null],
        [2, null],
      ])
    ).toBe(0);
  });

  test('should allows to override the default value', () => {
    expect(getLastValue(null, '-')).toBe('-');
  });
});
