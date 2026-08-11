/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asDuration } from '.';

describe('asDuration', () => {
  test('formats microseconds into human-readable units', () => {
    expect(asDuration(999)).toBe('999 μs');
    expect(asDuration(1_000)).toBe('1 ms');
    expect(asDuration(1_000_000)).toBe('1 s');
  });

  test('returns N/A for null and non-finite values', () => {
    expect(asDuration(null)).toBe('N/A');
    expect(asDuration(Number.NaN)).toBe('N/A');
    expect(asDuration(Number.POSITIVE_INFINITY)).toBe('N/A');
  });

  test('supports extended unit labels', () => {
    expect(asDuration(1_000, { extended: true })).toBe('1 milliseconds');
    expect(asDuration(1_000_000, { extended: true })).toBe('1 seconds');
    expect(asDuration(999, { extended: true })).toBe('999 microseconds');
  });
});
