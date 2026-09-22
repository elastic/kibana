/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { downsampleSparklinePoints, SPARKLINE_MAX_POINTS } from './downsample_sparkline_points';

describe('downsampleSparklinePoints', () => {
  it('returns the original array when the series is already short', () => {
    const points = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i }));
    expect(downsampleSparklinePoints(points)).toBe(points);
  });

  it('keeps first and last points and remains x-sorted', () => {
    const points = Array.from({ length: 500 }, (_, i) => ({ x: i, y: Math.sin(i / 10) }));
    const sampled = downsampleSparklinePoints(points);

    expect(sampled).toHaveLength(SPARKLINE_MAX_POINTS);
    expect(sampled[0]).toEqual(points[0]);
    expect(sampled[sampled.length - 1]).toEqual(points[points.length - 1]);
    for (let i = 1; i < sampled.length; i++) {
      expect(sampled[i].x).toBeGreaterThan(sampled[i - 1].x);
    }
  });

  it('retains a single-point spike', () => {
    const points = Array.from({ length: 500 }, (_, i) => ({ x: i, y: 0 }));
    points[250] = { x: 250, y: 100 };

    const sampled = downsampleSparklinePoints(points);
    expect(sampled.some((point) => point.y === 100 && point.x === 250)).toBe(true);
  });
});
