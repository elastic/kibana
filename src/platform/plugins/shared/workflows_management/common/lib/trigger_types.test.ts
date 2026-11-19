/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseIntervalString } from './trigger_types';

describe('parseIntervalString', () => {
  it.each([
    ['5m', { value: 5, unit: 'm' }],
    ['2h', { value: 2, unit: 'h' }],
    ['1d', { value: 1, unit: 'd' }],
    ['30s', { value: 30, unit: 's' }],
    ['100m', { value: 100, unit: 'm' }],
  ])('parses valid interval "%s"', (input, expected) => {
    expect(parseIntervalString(input)).toEqual(expected);
  });

  it.each([[''], ['abc'], ['5x'], ['m5'], ['5.5m'], ['-1m'], ['0m'], ['5'], ['  5m'], ['5m ']])(
    'returns null for invalid interval "%s"',
    (input) => {
      expect(parseIntervalString(input)).toBeNull();
    }
  );
});
