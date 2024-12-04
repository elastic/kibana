/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsClient } from '@elastic/ebt/client';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { getTimestampRangeInSeconds } from './get_timerange_in_seconds';

const MAX_CUSTOM_METRICS = 9;
// The keys and values for the custom metrics are limited to 9 pairs
const ALLOWED_CUSTOM_METRICS_KEYS_VALUES = Array.from({ length: MAX_CUSTOM_METRICS }, (_, i) => [
  `key${i + 1}`,
  `value${i + 1}`,
]).flat();

export function trackPerformanceMeasureEntries(analytics: AnalyticsClient, isDevMode: boolean) {
  function perfObserver(
    list: PerformanceObserverEntryList,
    observer: PerformanceObserver,
    droppedEntriesCount: number
  ) {
    list.getEntries().forEach((entry: any) => {
      if (entry.entryType === 'measure' && entry.detail?.type === 'kibana:performance') {
        const target = entry?.name;
        const duration = entry.duration;
        const meta = entry.detail?.meta;
        const customMetrics = Object.keys(entry.detail?.customMetrics ?? {}).reduce(
          (acc, metric) => {
            if (ALLOWED_CUSTOM_METRICS_KEYS_VALUES.includes(metric)) {
              return {
                ...acc,
                [metric]: entry.detail.customMetrics[metric],
              };
            }

            return acc;
          },
          {}
        );

        if (isDevMode) {
          if (!target) {
            // eslint-disable-next-line no-console
            console.error(`Failed to report the performance entry. Measure name is undefined`);
          }

          if (!duration) {
            // eslint-disable-next-line no-console
            console.error(
              `Failed to report the performance entry. Duration for the measure: ${target} is undefined`
            );
          }

          // eslint-disable-next-line no-console
          console.log(`The measure ${target} completed in ${duration / 1000}s`);
        }

        if (droppedEntriesCount > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `${droppedEntriesCount} performance entries got dropped due to the buffer being full.`
          );
        }

        try {
          reportPerformanceMetricEvent(analytics, {
            eventName: entry.detail.eventName,
            duration,
            ...customMetrics,
            meta: {
              target,
              query_range_secs: meta
                ? getTimestampRangeInSeconds(meta.startDate, meta.endDate, isDevMode)
                : undefined,
            },
          });
        } catch (error) {
          if (isDevMode) {
            // eslint-disable-next-line no-console
            console.error(`Failed to report the performance event`, { event, error });
          }
        }
      }
    });
  }

  const observer = new PerformanceObserver(perfObserver as PerformanceObserverCallback);
  observer.observe({ type: 'measure', buffered: true });
}
