/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSpringTiming } from './spring';

const getPoints = (easing: string) =>
  easing
    .replace(/^linear\(|\)$/g, '')
    .split(',')
    .map((point) => Number(point.trim()));

describe('createSpringTiming', () => {
  it('produces a CSS linear() easing that starts at 0 and ends at 1', () => {
    const { easing } = createSpringTiming({ stiffness: 460, damping: 27 });
    const points = getPoints(easing);

    expect(easing.startsWith('linear(')).toBe(true);
    expect(points[0]).toBe(0);
    expect(points[points.length - 1]).toBe(1);
  });

  it('settles quickly for the toolbar entrance', () => {
    const { duration } = createSpringTiming({ stiffness: 460, damping: 27 });

    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000);
  });

  it('overshoots past 1 when the spring is underdamped', () => {
    const { easing } = createSpringTiming({ stiffness: 460, damping: 27 });

    expect(Math.max(...getPoints(easing))).toBeGreaterThan(1);
  });

  it('never overshoots when the spring is heavily damped', () => {
    const { easing } = createSpringTiming({ stiffness: 100, damping: 40 });

    expect(Math.max(...getPoints(easing))).toBeLessThanOrEqual(1);
  });
});
