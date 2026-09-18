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

/** @internal */
export type EluHistorySmoothingAlgorithm = 'ema' | 'time-weighted-ema';

/**
 * Fixed-interval exponential moving average (sample-count warm-up).
 *
 * @see https://en.wikipedia.org/wiki/Exponential_smoothing
 */
export function intervalBasedExponentialMovingAverage(
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
          return (mean += (current * interval) / period);
        }
        return (previous = previous == null ? current : alpha * current + (1 - alpha) * previous);
      })
    );
  };
}

/**
 * Time-weighted exponential moving average (elapsed-time warm-up and smoothing).
 *
 * @see https://en.wikipedia.org/wiki/Exponential_smoothing
 */
export function timeWeightedExponentialMovingAverage(
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

/** @internal */
export function createExponentialMovingAverage(
  algorithm: EluHistorySmoothingAlgorithm,
  period: number,
  expectedInterval: number,
  timestampProvider: TimestampProvider = wallClock
): OperatorFunction<number, number> {
  return algorithm === 'time-weighted-ema'
    ? timeWeightedExponentialMovingAverage(period, expectedInterval, timestampProvider)
    : intervalBasedExponentialMovingAverage(period, expectedInterval);
}
