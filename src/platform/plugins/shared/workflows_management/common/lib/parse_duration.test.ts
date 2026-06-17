/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDurationValue, parseDuration } from './parse_duration';

describe('parseDuration', () => {
  it.each([
    ['2s', 2000],
    ['500ms', 500],
    ['1m', 60000],
    ['1m30s', 90000],
    ['1h2m', 3720000],
  ])('parses %s to %i ms', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it('throws for invalid duration strings', () => {
    expect(() => parseDuration('2x')).toThrow(/Invalid duration format/);
  });
});

describe('isDurationValue', () => {
  it.each([
    ['2s', true],
    ['1m30s', true],
    ['2000', false],
    ['foo', false],
  ])('returns %s => %s', (input, expected) => {
    expect(isDurationValue(input)).toBe(expected);
  });
});
