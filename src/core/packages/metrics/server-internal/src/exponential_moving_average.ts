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
 * @remarks uses the mean value until the observed window is filled to avoid effect on startup
 */
export function exponentialMovingAverage(
  period: number,
  interval: number
): OperatorFunction<number, number> {
  const alpha = 1 - Math.exp(-interval / period);

  return (inner) => {
    // option 2: return mean value until the observed window is filled
    let previous: number | undefined;
    let mean = 0;

    return inner.pipe(
      map((current, index) => {
        if (index < period / interval) {
          return (mean += (current * interval) / period); // more accurate than `current / (period / interval)`
        }

        return (previous = previous == null ? current : alpha * current + (1 - alpha) * previous);
      })
    );
  };
}
