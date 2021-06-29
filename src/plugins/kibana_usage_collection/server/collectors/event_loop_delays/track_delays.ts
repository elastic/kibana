/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { takeUntil, finalize, map } from 'rxjs/operators';
import { Observable, timer } from 'rxjs';
import type { ISavedObjectsRepository } from 'kibana/server';
import {
  MONITOR_EVENT_LOOP_DELAYS_START,
  MONITOR_EVENT_LOOP_DELAYS_INTERVAL,
  MONITOR_EVENT_LOOP_DELAYS_RESET,
} from './constants';
import { storeHistogram } from './saved_objects';
import { EventLoopDelaysCollector } from './event_loop_delays';

/**
 * The monitoring of the event loop starts immediately.
 * The first collection of the histogram happens after 1 minute.
 * The daily histogram data is updated every 1 hour.
 */
export function startTrackingEventLoopDelaysUsage(
  internalRepository: ISavedObjectsRepository,
  stopMonitoringEventLoop$: Observable<void>,
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

  const eventLoopDelaysCollector = new EventLoopDelaysCollector();
  const resetOnCount = Math.ceil(histogramReset / collectionInterval);

  timer(collectionStartDelay, collectionInterval)
    .pipe(
      map((i) => (i + 1) % resetOnCount === 0),
      takeUntil(stopMonitoringEventLoop$),
      finalize(() => eventLoopDelaysCollector.stop())
    )
    .subscribe(async (shouldReset) => {
      const histogram = eventLoopDelaysCollector.collect();
      if (shouldReset) {
        eventLoopDelaysCollector.reset();
      }
      await storeHistogram(histogram, internalRepository);
    });
}
