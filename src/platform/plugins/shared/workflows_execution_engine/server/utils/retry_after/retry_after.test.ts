/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRetryAfterMsFromHeaders } from './retry_after';

describe('getRetryAfterMsFromHeaders', () => {
  it('returns undefined when no hint header is present', () => {
    expect(getRetryAfterMsFromHeaders({})).toBeUndefined();
    expect(getRetryAfterMsFromHeaders({ 'content-type': 'application/json' })).toBeUndefined();
  });

  it('parses Retry-After as delta-seconds', () => {
    expect(getRetryAfterMsFromHeaders({ 'retry-after': '47' })).toBe(47000);
  });

  it('ignores non-numeric Retry-After', () => {
    expect(
      getRetryAfterMsFromHeaders({ 'retry-after': 'Tue, 1 Jan 2025 00:00:00 GMT' })
    ).toBeUndefined();
  });

  it('prefers Retry-After over X-RateLimit-Reset', () => {
    expect(
      getRetryAfterMsFromHeaders({
        'retry-after': '10',
        'x-ratelimit-reset': '9999999999',
      })
    ).toBe(10000);
  });

  it('parses X-RateLimit-Reset as delta-seconds when it is small', () => {
    expect(getRetryAfterMsFromHeaders({ 'x-ratelimit-reset': '60' })).toBe(60000);
  });

  it('interprets X-RateLimit-Reset as Unix timestamp when far in the future', () => {
    const futureSeconds = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    expect(
      getRetryAfterMsFromHeaders({ 'x-ratelimit-reset': String(futureSeconds) })
    ).toBeGreaterThanOrEqual(365 * 24 * 60 * 60 * 1000 - 5000);
    expect(
      getRetryAfterMsFromHeaders({ 'x-ratelimit-reset': String(futureSeconds) })
    ).toBeLessThanOrEqual(365 * 24 * 60 * 60 * 1000 + 5000);
  });

  it('interprets X-RateLimit-Reset as Unix timestamp for a near-future reset (now + 60s)', () => {
    const futureSeconds = Math.floor(Date.now() / 1000) + 60;
    const ms = getRetryAfterMsFromHeaders({ 'x-ratelimit-reset': String(futureSeconds) });
    expect(ms).toBeGreaterThanOrEqual(58000);
    expect(ms).toBeLessThanOrEqual(62000);
  });

  it('clamps an elapsed X-RateLimit-Reset timestamp to zero (now - 30s)', () => {
    const pastSeconds = Math.floor(Date.now() / 1000) - 30;
    expect(getRetryAfterMsFromHeaders({ 'x-ratelimit-reset': String(pastSeconds) })).toBe(0);
  });

  it('clamps negative values to zero', () => {
    expect(getRetryAfterMsFromHeaders({ 'retry-after': '-5' })).toBe(0);
  });
});
