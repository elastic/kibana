/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

/**
 * Options accepted by {@link withPerformanceMetrics}.
 */
export interface PerformanceMetricsOptions {
  /** Analytics service used to report the EBT event (typically `coreServices.analytics`). */
  analytics: AnalyticsServiceStart;
  /**
   * EBT event name to report — see `SAVED_OBJECT_LOADED_TIME` /
   * `SAVED_OBJECT_DELETE_TIME` in consumers.
   */
  eventName: string;
  /** Saved object type, recorded as `meta.saved_object_type`. */
  savedObjectType: string;
  /**
   * Extra metadata merged into the EBT event's `meta`. Useful for `total`
   * counts on bulk operations.
   */
  meta?: (args: unknown[], result: unknown) => Record<string, unknown>;
}

/**
 * Wrap a function (typically `findItems` or a bulk delete) so that each call
 * reports a `reportPerformanceMetricEvent` with the elapsed `duration` in ms.
 *
 * The wrapped function's return value passes through unchanged. Errors
 * propagate without reporting — the caller decides whether to count failed
 * calls as observations.
 *
 * @example
 * ```ts
 * const search = withPerformanceMetrics(rawSearch, {
 *   analytics: coreServices.analytics,
 *   eventName: SAVED_OBJECT_LOADED_TIME,
 *   savedObjectType: 'dashboard',
 * });
 * ```
 *
 * @example With per-call meta
 * ```ts
 * const deleteMany = withPerformanceMetrics(rawDelete, {
 *   analytics,
 *   eventName: SAVED_OBJECT_DELETE_TIME,
 *   savedObjectType: 'dashboard',
 *   meta: ([items]) => ({ total: items.length }),
 * });
 * ```
 */
export const withPerformanceMetrics = <Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  { analytics, eventName, savedObjectType, meta }: PerformanceMetricsOptions
): ((...args: Args) => Promise<Result>) => {
  return async (...args: Args): Promise<Result> => {
    const startTime = window.performance.now();
    const result = await fn(...args);
    const duration = window.performance.now() - startTime;

    reportPerformanceMetricEvent(analytics, {
      eventName,
      duration,
      meta: {
        saved_object_type: savedObjectType,
        ...(meta ? meta(args as unknown[], result) : {}),
      },
    });

    return result;
  };
};
