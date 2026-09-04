/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { wilsonLowerBound } from './wilson';

describe('wilsonLowerBound', () => {
  it('returns 0 when there is no evidence', () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
    expect(wilsonLowerBound(0, 500)).toBe(0);
    expect(wilsonLowerBound(5, 0)).toBe(0);
    expect(wilsonLowerBound(-1, 100)).toBe(0);
  });

  it('matches known bounds from measured spec files', () => {
    // migrate_legacy_policies.spec.ts: 412 of 570 builds
    expect(wilsonLowerBound(412, 570)).toBeCloseTo(0.6847, 3);
    // step_details.spec.ts: 15 of 286 builds
    expect(wilsonLowerBound(15, 286)).toBeCloseTo(0.032, 3);
    // esql_conversion_disabled.spec.ts: 5 of 173 builds, the one the bound rejects
    expect(wilsonLowerBound(5, 173)).toBeCloseTo(0.0124, 3);
  });

  it('is always below the point estimate', () => {
    for (const [failures, trials] of [
      [1, 20],
      [5, 173],
      [50, 100],
      [412, 570],
    ]) {
      expect(wilsonLowerBound(failures, trials)).toBeLessThan(failures / trials);
    }
  });

  it('penalises small samples at the same observed rate', () => {
    const small = wilsonLowerBound(3, 100);
    const medium = wilsonLowerBound(15, 500);
    const large = wilsonLowerBound(30, 1000);

    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
  });

  it('keeps a 3% observed rate below a 3% bar until the sample is large', () => {
    // The measured motivation for the bound: at n=50 a 3% observation is indistinguishable
    // from noise, so it must not clear a 3% threshold.
    expect(wilsonLowerBound(2, 50)).toBeLessThan(0.03);
    expect(wilsonLowerBound(6, 200)).toBeLessThan(0.03);
  });

  it('never exceeds 1 even if failures are miscounted above trials', () => {
    expect(wilsonLowerBound(120, 100)).toBeLessThanOrEqual(1);
  });

  it('widens the interval for a larger z', () => {
    expect(wilsonLowerBound(50, 500, 2.58)).toBeLessThan(wilsonLowerBound(50, 500, 1.96));
  });
});
