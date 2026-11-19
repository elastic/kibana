/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSparklineXDomain } from './change_point_summary_chart';

describe('getSparklineXDomain', () => {
  const points = [{ x: 1000 }, { x: 2000 }, { x: 3000 }];

  it('returns undefined for an empty series', () => {
    expect(getSparklineXDomain([])).toBeUndefined();
  });

  it('pads the domain so a marker at either end or outside the series is not clipped', () => {
    const dataSpan = 3000 - 1000;

    for (const annotation of [undefined, 500, 1000, 3000, 3500]) {
      const domain = getSparklineXDomain(points, annotation)!;
      const lo = annotation === undefined ? 1000 : Math.min(1000, annotation);
      const hi = annotation === undefined ? 3000 : Math.max(3000, annotation);
      expect(domain.min).toBeLessThan(lo);
      expect(domain.max).toBeGreaterThan(hi);
      expect(domain.max - domain.min).toBeGreaterThan(dataSpan);
    }
  });

  it('produces a non-zero span for a single-point series', () => {
    const domain = getSparklineXDomain([{ x: 1000 }], 1000)!;
    expect(domain.max).toBeGreaterThan(domain.min);
  });
});
