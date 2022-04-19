/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { takeUntil, finalize } from 'rxjs/operators';
import { Observable, timer } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { EventLoopDelaysMonitor } from '@kbn/core/server';
import {
  MONITOR_EVENT_LOOP_THRESHOLD_START,
  MONITOR_EVENT_LOOP_THRESHOLD_INTERVAL,
  MONITOR_EVENT_LOOP_WARN_THRESHOLD,
} from './constants';

/**
 * The monitoring of the event loop starts immediately.
 * The first collection happens after 1 minute.
 * The histogram is collected and reset every 20 seconds.
 * logs a warning when threshold is exceeded (350ms) and increments a usage counter.
 */
export function startTrackingEventLoopDelaysThreshold(
  eventLoopCounter: UsageCounter,
  logger: Logger,
  stopMonitoringEventLoop$: Observable<void>,
  eventLoopDelaysMonitor: EventLoopDelaysMonitor,
  configs: {
    warnThreshold?: number;
    collectionStartDelay?: number;
    collectionInterval?: number;
  } = {}
) {
  const {
    warnThreshold = MONITOR_EVENT_LOOP_WARN_THRESHOLD,
    collectionStartDelay = MONITOR_EVENT_LOOP_THRESHOLD_START,
    collectionInterval = MONITOR_EVENT_LOOP_THRESHOLD_INTERVAL,
  } = configs;

  timer(collectionStartDelay, collectionInterval)
    .pipe(
      takeUntil(stopMonitoringEventLoop$),
      finalize(() => eventLoopDelaysMonitor.stop())
    )
    .subscribe(async () => {
      const { mean: meanMS } = eventLoopDelaysMonitor.collect();

      if (meanMS > warnThreshold) {
        logger.warn(
          `Average event loop delay threshold exceeded ${warnThreshold}ms. Received ${meanMS}ms. ` +
            `See https://ela.st/kibana-scaling-considerations for more information about scaling Kibana.`
        );

        eventLoopCounter.incrementCounter({
          counterName: 'delay_threshold_exceeded',
        });
      }

      eventLoopDelaysMonitor.reset();
    });
}
