/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveEffectiveSeed, serviceStableSeed } from './seed';

describe('resolveEffectiveSeed', () => {
  it('returns seed + index when seed is set (no timestamp)', () => {
    expect(resolveEffectiveSeed(100, 3)).toBe(103);
    expect(resolveEffectiveSeed(0, 0)).toBe(0);
    expect(resolveEffectiveSeed(42, 7)).toBe(49);
  });

  it('index=0, no timestamp returns seed unchanged', () => {
    expect(resolveEffectiveSeed(42, 0)).toBe(42);
  });

  it('includes timestamp in result when seed and timestamp are both provided', () => {
    expect(resolveEffectiveSeed(42, 0, 1_000)).toBe(1_042);
    expect(resolveEffectiveSeed(42, 3, 1_000)).toBe(1_045);
    // different timestamps → different tick seeds
    expect(resolveEffectiveSeed(42, 0, 1_000)).not.toBe(resolveEffectiveSeed(42, 0, 2_000));
  });

  it('returns timestamp + index when seed is undefined', () => {
    expect(resolveEffectiveSeed(undefined, 2, 1_000_000)).toBe(1_000_002);
    expect(resolveEffectiveSeed(undefined, 0, 500)).toBe(500);
  });

  it('falls back to Date.now() when both seed and timestamp are undefined', () => {
    const before = Date.now();
    const result = resolveEffectiveSeed(undefined, 0);
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it('different indices produce different seeds', () => {
    expect(resolveEffectiveSeed(42, 0)).not.toBe(resolveEffectiveSeed(42, 1));
    expect(resolveEffectiveSeed(undefined, 0, 1000)).not.toBe(
      resolveEffectiveSeed(undefined, 1, 1000)
    );
  });
});

describe('serviceStableSeed', () => {
  it('is deterministic: same (baseSeed, name) always returns the same value', () => {
    expect(serviceStableSeed(42, 'my-service')).toBe(serviceStableSeed(42, 'my-service'));
    expect(serviceStableSeed(0, 'svc')).toBe(serviceStableSeed(0, 'svc'));
  });

  it('returns different values for different service names', () => {
    expect(serviceStableSeed(42, 'service-a')).not.toBe(serviceStableSeed(42, 'service-b'));
    expect(serviceStableSeed(42, 'claim-intake')).not.toBe(serviceStableSeed(42, 'fraud-check'));
  });

  it('returns different values for different base seeds', () => {
    expect(serviceStableSeed(1, 'my-service')).not.toBe(serviceStableSeed(2, 'my-service'));
  });

  it('returns a valid uint32 (non-negative, within 32-bit range)', () => {
    const result = serviceStableSeed(0xffffffff, 'test');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('is not sensitive to tick index — same result regardless of how many ticks have passed', () => {
    const base = 42;
    const name = 'payment-processor';
    const seed0 = serviceStableSeed(base, name);
    const seed1 = serviceStableSeed(base, name);
    const seed100 = serviceStableSeed(base, name);
    expect(seed0).toBe(seed1);
    expect(seed0).toBe(seed100);
  });
});
