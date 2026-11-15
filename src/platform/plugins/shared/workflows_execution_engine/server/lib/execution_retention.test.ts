/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExecutionRetention, parseRetentionToMs } from './execution_retention';

describe('parseRetentionToMs', () => {
  it.each([
    ['90d', 90 * 86_400_000],
    ['12h', 12 * 3_600_000],
    ['30m', 1_800_000],
    ['45s', 45_000],
  ])('parses %s', (value, ms) => {
    expect(parseRetentionToMs(value)).toBe(ms);
  });

  it.each(['0d', '-1d', '1w', 'd', '', '1.5d'])('rejects %p', (value) => {
    expect(() => parseRetentionToMs(value)).toThrow('Invalid retention duration');
  });
});

describe('getExecutionRetention', () => {
  it('applies the configured duration to data stream storage', () => {
    expect(getExecutionRetention({ source: 'data_stream', dataRetention: '30d' })).toEqual({
      source: 'data_stream',
      retentionMs: 30 * 86_400_000,
    });
  });

  it('reports no expiry for plain index storage whatever the duration says', () => {
    expect(getExecutionRetention({ source: 'plain_index', dataRetention: '1h' })).toEqual({
      source: 'plain_index',
      retentionMs: null,
    });
  });
});
