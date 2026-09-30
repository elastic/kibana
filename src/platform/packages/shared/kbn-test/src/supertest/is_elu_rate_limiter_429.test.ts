/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEluRateLimiterRetryDelayMs, isEluRateLimiter429 } from './is_elu_rate_limiter_429';

describe('isEluRateLimiter429', () => {
  it('returns true for ELU rate limiter responses', () => {
    expect(
      isEluRateLimiter429({
        status: 429,
        headers: { RateLimit: '"elu";r=0;t=30' },
        text: 'Server is overloaded',
      })
    ).toBe(true);
  });

  it('returns false for other 429 responses', () => {
    expect(
      isEluRateLimiter429({
        status: 429,
        headers: { 'RateLimit-Limit': '100' },
        text: 'Too Many Requests',
      })
    ).toBe(false);
  });

  it('returns false for non-429 responses', () => {
    expect(
      isEluRateLimiter429({
        status: 503,
        headers: { RateLimit: '"elu";r=0;t=30' },
        text: 'Server is overloaded',
      })
    ).toBe(false);
  });
});

describe('getEluRateLimiterRetryDelayMs', () => {
  it('uses Retry-After when present', () => {
    expect(
      getEluRateLimiterRetryDelayMs({
        status: 429,
        headers: { 'Retry-After': '2' },
      })
    ).toBe(2000);
  });

  it('falls back to a minimum delay', () => {
    expect(getEluRateLimiterRetryDelayMs({ status: 429, headers: {} })).toBe(250);
  });
});
