/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { IEventLoopDelaysMonitor, IntervalHistogram } from '@kbn/core/server';
import { finalize, map, takeUntil } from 'rxjs';
import { Observable, switchMap, timer } from 'rxjs';
import {
  MONITOR_EVENT_LOOP_DELAYS_INTERVAL,
  MONITOR_EVENT_LOOP_DELAYS_RESET,
  MONITOR_EVENT_LOOP_DELAYS_START,
} from './constants';
import { storeHistogram } from './saved_objects';

/**
 * The monitoring of the event loop starts immediately.
 * The first collection of the histogram happens after 1 minute.
 * The daily histogram data is updated every 1 hour.
 * The histogram metrics are in milliseconds.
 */
export function startTrackingEventLoopDelaysUsage(
  internalRepository: ISavedObjectsRepository,
  instanceUuid: string,
  stopMonitoringEventLoop$: Observable<void>,
  eventLoopDelaysMonitor: IEventLoopDelaysMonitor<IntervalHistogram>,
  configs: {
    collectionStartDelay?: number;
    collectionInterval?: number;
    histogramReset?: number;
  } = {}
) {
  const {
    collectionStartDelay = MONITOR_EVENT_LOOP_DELAYS_START,
    collectionInterval = MONITOR_EVENT_LOOP_DELAYS_INTERVAL,
    histogramReset = MONITOR_EVENT_LOOP_DELAYS_RESET,
  } = configs;

  const resetOnCount = Math.ceil(histogramReset / collectionInterval);

  timer(collectionStartDelay, collectionInterval)
    .pipe(
      map((i) => (i + 1) % resetOnCount === 0),
      takeUntil(stopMonitoringEventLoop$),
      finalize(() => eventLoopDelaysMonitor.stop()),
      switchMap(async (shouldReset) => {
        const histogram = eventLoopDelaysMonitor.collect();
        if (shouldReset) {
          eventLoopDelaysMonitor.reset();
        }
        try {
          await storeHistogram(histogram, internalRepository, instanceUuid);
        } catch (e) {
          // do not crash if cannot store a histogram.
        }
      })
    )
    .subscribe();
}
