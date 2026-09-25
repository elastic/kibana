/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActivityBucket } from '../../../../../common/activity_investigation/activity_increase';
import {
  detectActivityChangePointSeries,
  type ActivityChangePointDetectorConfig,
  type ActivityChangePointResult,
} from '../../../../../common/activity_investigation/describe_activity_change_points';
import { MAX_CHANGE_POINT_BUCKETS } from '../../../../../common/activity_investigation/change_point';
import type { DiscoverServices } from '../../../../build_services';

/** Runs the shared detector in batches, preserving candidates for the final suggestion selection. */
export const detectActivityChangePoint = async (
  series: readonly (readonly ActivityBucket[])[],
  search: Pick<DiscoverServices['data']['search'], 'esql'>,
  abortSignal: AbortSignal,
  config: ActivityChangePointDetectorConfig
): Promise<ActivityChangePointResult[]> => {
  abortSignal.throwIfAborted();
  if (series.length === 0) return [];
  const buckets = series[0];
  if (
    buckets.length < config.minCompleteBuckets ||
    buckets.length > MAX_CHANGE_POINT_BUCKETS
  ) {
    throw new Error('Insufficient or excessive activity buckets');
  }
  const [{ startTimeMs, endTimeMs }] = buckets;
  const intervalMs = endTimeMs - startTimeMs;
  if (
    intervalMs <= 0 ||
    series.some(
      (items) =>
        items.length !== buckets.length ||
        items.some(
          (bucket, index) =>
            bucket.startTimeMs !== startTimeMs + index * intervalMs ||
            bucket.endTimeMs !== startTimeMs + (index + 1) * intervalMs
        )
    )
  ) {
    throw new Error('Activity series must use the same complete bucket boundaries');
  }

  return detectActivityChangePointSeries({
    series: series.map((items) => items.map(({ count }) => count)),
    intervalMs,
    startTimeMs,
    config,
    signal: abortSignal,
    execute: async (query, signal) => {
      const { rawResponse, warning } = await search.esql(
        { query },
        { abortSignal: signal, approximation: false, dropNullColumns: false }
      );
      if (
        warning ||
        rawResponse.is_partial ||
        rawResponse.is_running ||
        ('approximation_applied' in rawResponse && rawResponse.approximation_applied)
      ) {
        throw new Error('Incomplete CHANGE_POINT response');
      }
      return rawResponse;
    },
  });
};
