/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map, type OperatorFunction, type TimestampProvider } from 'rxjs';

const wallClock: TimestampProvider = {
  now: () => Date.now(),
};

/**
 * An RxJS operator implementing the exponential moving average function.
 *
 * @see https://en.wikipedia.org/wiki/Exponential_smoothing
 * @param period The period of time.
 * @param expectedInterval The nominal interval between values; used for the first sample and when samples arrive back-to-back.
 * @param timestampProvider Optional clock for elapsed-time weighting (defaults to wall clock).
 * @returns An operator emitting smoothed values.
 * @remarks
 * Uses **accumulating mean value** until the observation window is full (i.e., until enough elapsed time has been covered),
 * then switches to exponential smoothing for subsequent values. The switch happens when accumulated elapsed time reaches `period`.
 * Smoothing uses `alpha = 1 - exp(-dt / period)` where `dt` is the actual time since the previous sample.
 */
export function exponentialMovingAverage(
  period: number,
  expectedInterval: number,
  timestampProvider: TimestampProvider = wallClock
): OperatorFunction<number, number> {
  return (inner) => {
    let previous: number | undefined;
    let mean = 0;
    let elapsed = 0;
    let lastTimestamp: number | undefined;

    return inner.pipe(
      map((current) => {
        const timestamp = timestampProvider.now();
        const dt =
          lastTimestamp == null ? expectedInterval : Math.max(timestamp - lastTimestamp, 0);
        lastTimestamp = timestamp;

        if (elapsed < period) {
          elapsed += dt;
          mean += (current * dt) / period;

          if (elapsed >= period) {
            previous = mean;
          }

          return mean;
        }

        const alpha = 1 - Math.exp(-dt / period);
        return (previous = alpha * current + (1 - alpha) * (previous ?? current));
      })
    );
  };
}
