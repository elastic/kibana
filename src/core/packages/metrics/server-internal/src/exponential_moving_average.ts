/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type OperatorFunction, map } from 'rxjs';

/**
 * An RxJS operator implementing the exponential moving average function.
 *
 * @see https://en.wikipedia.org/wiki/Exponential_smoothing
 * @param period The period of time.
 * @param interval The interval between values.
 * @returns An operator emitting smoothed values.
 * @remarks
 * Uses **accumulating mean value** until the observation window is full (i.e., until enough samples have been received to cover the specified period),
 * then switches to exponential smoothing for subsequent values. The switch happens when the number of values emitted reaches `period / interval`.
 * This ensures the initial output isn't biased by insufficient data, and provides a smooth transition to exponential smoothing.
 */
export function exponentialMovingAverage(
  period: number,
  interval: number
): OperatorFunction<number, number> {
  const alpha = 1 - Math.exp(-interval / period);

  return (inner) => {
    let previous: number | undefined;
    let mean = 0;

    return inner.pipe(
      map((current, index) => {
        if (index < period / interval) {
          return (mean += (current * interval) / period); // accumulating mean value
        }
        return (previous = previous == null ? current : alpha * current + (1 - alpha) * previous); // smoothing
      })
    );
  };
}
