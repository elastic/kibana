/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const supportsLinearEasing = () =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('animation-timing-function', 'linear(0, 1)');

export interface Timing {
  duration: number;
  easing: string;
}

/**
 * Simulates a spring from 0 to 1 and encodes it as a CSS `linear()` easing, so WAAPI animations
 * get spring physics (natural settle, optional overshoot) without an animation library.
 */
export const createSpringTiming = ({
  stiffness,
  damping,
}: {
  stiffness: number;
  damping: number;
}): Timing => {
  const step = 1 / 120;
  const samples: number[] = [];
  let position = 0;
  let velocity = 0;
  let time = 0;
  while (time < 2) {
    velocity += (-stiffness * (position - 1) - damping * velocity) * step;
    position += velocity * step;
    time += step;
    samples.push(position);
    if (Math.abs(position - 1) < 0.001 && Math.abs(velocity) < 0.01) break;
  }
  // ~60 points per second is plenty for a smooth curve
  const points = samples.filter((_, i) => i % 2 === 1).map((value) => value.toFixed(4));
  return {
    duration: Math.round(time * 1000),
    easing: `linear(0, ${points.join(', ')}, 1)`,
  };
};
