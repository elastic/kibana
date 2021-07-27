/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { takeUntil, finalize } from 'rxjs/operators';
import { Observable, timer } from 'rxjs';
import type { Logger } from 'kibana/server';
import moment from 'moment';
import type { UsageCounter } from '../../../../usage_collection/server';
import {
  MONITOR_EVENT_LOOP_THRESHOLD_START,
  MONITOR_EVENT_LOOP_THRESHOLD_INTERVAL,
  MONITOR_EVENT_LOOP_WARN_THRESHOLD,
  ONE_MILLISECOND_AS_NANOSECONDS,
} from './constants';
import { EventLoopDelaysCollector } from './event_loop_delays';

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

  const eventLoopDelaysCollector = new EventLoopDelaysCollector();
  timer(collectionStartDelay, collectionInterval)
    .pipe(
      takeUntil(stopMonitoringEventLoop$),
      finalize(() => eventLoopDelaysCollector.stop())
    )
    .subscribe(async () => {
      const { mean } = eventLoopDelaysCollector.collect();
      const meanDurationMs = moment
        .duration(mean / ONE_MILLISECOND_AS_NANOSECONDS)
        .asMilliseconds();

      if (meanDurationMs > warnThreshold) {
        logger.warn(
          `Average event loop delay threshold exceeded ${warnThreshold}ms. Received ${meanDurationMs}ms. ` +
            `See https://ela.st/kibana-scaling-considerations for more information about scaling Kibana.`
        );

        eventLoopCounter.incrementCounter({
          counterName: 'delay_threshold_exceeded',
        });
      }

      eventLoopDelaysCollector.reset();
    });
}
