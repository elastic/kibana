/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asFloat } from './as_float';

const hasFractionalPart = (value: number) => JSON.stringify(value).includes('.');

describe('asFloat', () => {
  it('rounds to 0.1 precision by default', () => {
    expect(asFloat(123.456)).toBe(123.5);
  });

  it('keeps a fractional part after JSON serialization for integral values', () => {
    [0, 1, 2.0, 1234, 1234.04, 99.96].forEach((value) => {
      const result = asFloat(value);
      expect(hasFractionalPart(result)).toBe(true);
      expect(Math.abs(result - value)).toBeLessThan(0.1);
    });
  });

  it('leaves values that already have a fractional part untouched', () => {
    expect(asFloat(12.3)).toBe(12.3);
  });

  it('supports a custom precision', () => {
    expect(asFloat(0.123456, 4)).toBe(0.1235);
    expect(hasFractionalPart(asFloat(0, 4))).toBe(true);
    expect(asFloat(0, 4)).toBeLessThan(0.0001);
  });
});
