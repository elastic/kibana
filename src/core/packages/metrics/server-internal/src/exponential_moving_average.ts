/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'node:perf_hooks';
import { map, type OperatorFunction, type TimestampProvider } from 'rxjs';

/** @internal */
export const eluHistoryAlgorithms = ['ema', 'time-weighted-ema'] as const;

/** @internal */
export type EluHistoryAlgorithm = (typeof eluHistoryAlgorithms)[number];

const monotonicClock: TimestampProvider = {
  now: () => performance.now(),
};

/**
 * Exponential moving average with sample-count warm-up.
 *
 * Warm-up accumulates `(current × expectedInterval) / period` for the first `period / expectedInterval`
 * samples, then switches to exponential smoothing. With `ema`, α is fixed from the collection interval;
 * with `time-weighted-ema`, α is derived from the monotonic gap since the previous sample.
 *
 * @see https://en.wikipedia.org/wiki/Exponential_smoothing
 */
export function createExponentialMovingAverage(
  algorithm: EluHistoryAlgorithm,
  period: number,
  expectedInterval: number,
  timestampProvider: TimestampProvider = monotonicClock
): OperatorFunction<number, number> {
  const fixedAlpha = 1 - Math.exp(-expectedInterval / period);
  const warmUpSampleCount = period / expectedInterval;
  const useTimeWeightedAlpha = algorithm === 'time-weighted-ema';

  return (inner) => {
    let previous: number | undefined;
    let mean = 0;
    let lastTimestamp: number | undefined;

    return inner.pipe(
      map((current, index) => {
        let sampleGapMs = expectedInterval;

        if (useTimeWeightedAlpha) {
          const timestamp = timestampProvider.now();
          sampleGapMs =
            lastTimestamp == null ? expectedInterval : Math.max(timestamp - lastTimestamp, 0);
          lastTimestamp = timestamp;
        }

        if (index < warmUpSampleCount) {
          return (mean += (current * expectedInterval) / period);
        }

        const alpha = useTimeWeightedAlpha ? 1 - Math.exp(-sampleGapMs / period) : fixedAlpha;

        // Intentionally seed the first post-warm-up step from `current`, not warm-up `mean`: startup
        // ELU is often high but expected, and blending from the mean would treat it as sustained load.
        return (previous =
          previous == null ? current : alpha * current + (1 - alpha) * previous);
      })
    );
  };
}
