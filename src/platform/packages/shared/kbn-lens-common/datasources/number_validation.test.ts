/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidNumber } from './number_validation';

describe('isValidNumber', () => {
  it('should work for integers', () => {
    const number = 99;
    for (const value of [number, `${number}`]) {
      expect(isValidNumber(value)).toBeTruthy();
      expect(isValidNumber(value, true)).toBeTruthy();
      expect(isValidNumber(value, false)).toBeTruthy();
      expect(isValidNumber(value, true, number, 1)).toBeTruthy();
      expect(isValidNumber(value, true, number + 1, number)).toBeTruthy();
      expect(isValidNumber(value, false, number, 1)).toBeTruthy();
      expect(isValidNumber(value, false, number + 1, number)).toBeTruthy();
      expect(isValidNumber(value, false, number + 1, number, 2)).toBeTruthy();
      expect(isValidNumber(value, false, number - 1, number - 2)).toBeFalsy();
    }
  });

  it('should work correctly for numeric falsy values', () => {
    expect(isValidNumber(0)).toBeTruthy();
    expect(isValidNumber(0, true)).toBeTruthy();
    expect(isValidNumber(0, false)).toBeTruthy();
    expect(isValidNumber(0, true, 1, 0)).toBeTruthy();
  });

  it('should work for decimals', () => {
    const number = 99.9;
    for (const value of [number, `${number}`]) {
      expect(isValidNumber(value)).toBeTruthy();
      expect(isValidNumber(value, true)).toBeFalsy();
      expect(isValidNumber(value, false)).toBeTruthy();
      expect(isValidNumber(value, true, number, 1)).toBeFalsy();
      expect(isValidNumber(value, true, number + 1, number)).toBeFalsy();
      expect(isValidNumber(value, false, number, 1)).toBeTruthy();
      expect(isValidNumber(value, false, number + 1, number)).toBeTruthy();
      expect(isValidNumber(value, false, number + 1, number, 0)).toBeFalsy();
      expect(isValidNumber(value, false, number + 1, number, 1)).toBeTruthy();
      expect(isValidNumber(value, false, number + 1, number, 2)).toBeTruthy();
      expect(isValidNumber(value, false, number - 1, number - 2)).toBeFalsy();
    }
  });

  it('should work for negative values', () => {
    const number = -10.1;
    for (const value of [number, `${number}`]) {
      expect(isValidNumber(value)).toBeTruthy();
      expect(isValidNumber(value, true)).toBeFalsy();
      expect(isValidNumber(value, false)).toBeTruthy();
      expect(isValidNumber(value, true, number, -20)).toBeFalsy();
      expect(isValidNumber(value, true, number + 1, number)).toBeFalsy();
      expect(isValidNumber(value, false, number, -20)).toBeTruthy();
      expect(isValidNumber(value, false, number + 1, number)).toBeTruthy();
      expect(isValidNumber(value, false, number + 1, number, 0)).toBeFalsy();
      expect(isValidNumber(value, false, number + 1, number, 1)).toBeTruthy();
      expect(isValidNumber(value, false, number + 1, number, 2)).toBeTruthy();
      expect(isValidNumber(value, false, number - 1, number - 2)).toBeFalsy();
    }
  });

  it('should spot invalid values', () => {
    for (const value of [NaN, ``, undefined, null, Infinity, -Infinity]) {
      expect(isValidNumber(value)).toBeFalsy();
      expect(isValidNumber(value, true)).toBeFalsy();
      expect(isValidNumber(value, false)).toBeFalsy();
      expect(isValidNumber(value, true, 99, 1)).toBeFalsy();
      expect(isValidNumber(value, true, 99, 1)).toBeFalsy();
      expect(isValidNumber(value, false, 99, 1)).toBeFalsy();
      expect(isValidNumber(value, false, 99, 1)).toBeFalsy();
      expect(isValidNumber(value, false, 99, 1, 0)).toBeFalsy();
      expect(isValidNumber(value, false, 99, 1, 1)).toBeFalsy();
      expect(isValidNumber(value, false, 99, 1, 2)).toBeFalsy();
    }
  });
});
