/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNextPollInterval } from './constants';

describe('getNextPollInterval', () => {
  test.each([
    [0, '1s'],
    [1, '2s'],
    [2, '4s'],
    [3, '8s'],
    [4, '16s'],
    [5, '30s'],
    [6, '30s'],
    [10, '30s'],
  ])('returns correct duration for pollCount %i', (pollCount, expected) => {
    expect(getNextPollInterval(pollCount)).toBe(expected);
  });

  it('caps at MAX_POLL_INTERVAL for large poll counts', () => {
    expect(getNextPollInterval(100)).toBe('30s');
  });
});
