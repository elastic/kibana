/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isShortTimeRangeForRate } from './user_messages';

describe('isShortTimeRangeForRate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-31T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return false when timeRange is undefined', () => {
    expect(isShortTimeRangeForRate(undefined)).toBe(false);
  });

  it('should return true for a 15-minute range', () => {
    expect(isShortTimeRangeForRate({ from: 'now-15m', to: 'now' })).toBe(true);
  });

  it('should return true for a 30-minute range', () => {
    expect(isShortTimeRangeForRate({ from: 'now-30m', to: 'now' })).toBe(true);
  });

  it('should return true for a 1-hour range', () => {
    expect(isShortTimeRangeForRate({ from: 'now-1h', to: 'now' })).toBe(true);
  });

  it('should return false for a 2-hour range', () => {
    expect(isShortTimeRangeForRate({ from: 'now-2h', to: 'now' })).toBe(false);
  });

  it('should return false for a 24-hour range', () => {
    expect(isShortTimeRangeForRate({ from: 'now-24h', to: 'now' })).toBe(false);
  });

  it('should return true for a short absolute range', () => {
    expect(
      isShortTimeRangeForRate({
        from: '2026-03-31T11:30:00Z',
        to: '2026-03-31T12:00:00Z',
      })
    ).toBe(true);
  });

  it('should return false for a long absolute range', () => {
    expect(
      isShortTimeRangeForRate({
        from: '2026-03-30T12:00:00Z',
        to: '2026-03-31T12:00:00Z',
      })
    ).toBe(false);
  });

  it('should return false for unparseable date strings', () => {
    expect(isShortTimeRangeForRate({ from: 'invalid', to: 'also-invalid' })).toBe(false);
  });
});
