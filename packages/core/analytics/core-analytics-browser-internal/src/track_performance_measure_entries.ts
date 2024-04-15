/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AnalyticsClient } from '@kbn/analytics-client';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

export function trackPerformanceMeasureEntries(analytics: AnalyticsClient, isDevMode: boolean) {
  function perfObserver(
    list: PerformanceObserverEntryList,
    observer: PerformanceObserver,
    droppedEntriesCount: number
  ) {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure') {
        const measureName = entry?.name;
        const duration = entry.duration;

        if (isDevMode) {
          if (!measureName) {
            console.error(`Failed to report the performance entry. Measure name is undefined`);
          }

          if (!duration) {
            console.error(
              `Failed to report the performance entry. Duration for the measure: ${measureName} is undefined`
            );
          }

          console.log(`The measure ${measureName} completed in ${duration}ms`);
        }

        if (droppedEntriesCount > 0) {
          console.warn(`${droppedEntriesCount} entries got dropped due to the buffer being full.`);
        }

        try {
          reportPerformanceMetricEvent(analytics, {
            eventName: measureName,
            duration,
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

  const observer = new PerformanceObserver(perfObserver);
  observer.observe({ type: 'measure', buffered: true });
}
