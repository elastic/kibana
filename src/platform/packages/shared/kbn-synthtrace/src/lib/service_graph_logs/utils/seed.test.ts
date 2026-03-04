/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deriveSeed, resolveEffectiveSeed } from './seed';

describe('resolveEffectiveSeed', () => {
  it('combines seed + index + timestamp', () => {
    expect(resolveEffectiveSeed(42, 3, 1_000)).toBe(1_045);
  });

  it('falls back to timestamp when seed is undefined', () => {
    expect(resolveEffectiveSeed(undefined, 2, 1_000)).toBe(1_002);
  });

  it('falls back to Date.now() when both seed and timestamp are undefined', () => {
    const before = Date.now();
    const result = resolveEffectiveSeed(undefined, 0);
    expect(result).toBeGreaterThanOrEqual(before);
  });
});

describe('deriveSeed', () => {
  it('is deterministic and unique per (baseSeed, name)', () => {
    expect(deriveSeed(42, 'svc-a')).toBe(deriveSeed(42, 'svc-a'));
    expect(deriveSeed(42, 'svc-a')).not.toBe(deriveSeed(42, 'svc-b'));
  });

  it('returns a valid uint32', () => {
    const result = deriveSeed(0xffffffff, 'test');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
});
