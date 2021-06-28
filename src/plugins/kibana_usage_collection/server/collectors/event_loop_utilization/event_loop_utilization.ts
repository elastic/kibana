/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EventLoopUtilization } from 'perf_hooks';
import { performance } from 'perf_hooks';
import { takeUntil } from 'rxjs/operators';
import { Observable, timer } from 'rxjs';
import type { Logger } from 'kibana/server';

import { UsageCollectionSetup } from '../../../../usage_collection/server';

import {
  MONITOR_EVENT_LOOP_UTILIZATION_START,
  MONITOR_EVENT_LOOP_UTILIZATION_INTERVAL,
} from './constants';

export class EventLoopUtlizationCollector {
  private elu: EventLoopUtilization;

  constructor() {
    this.elu = performance.eventLoopUtilization();
  }

  public collect() {
    const { active, idle, utilization } = performance.eventLoopUtilization(this.elu);

    return {
      active,
      idle,
      utilization,
    };
  }

  public reset() {
    this.elu = performance.eventLoopUtilization();
  }
}

/**
 * The monitoring of the event loop utilization starts immediately.
 * The first collection happens after 1 minute.
 * The utilization is collected and reset every 5 seconds.
 * logs a warning when threshold is exceeded and increments usage counter.
 */
export function startTrackingEventLoopDelaysUsage(
  usageCollection: UsageCollectionSetup,
  logger: Logger,
  utilizationThreshold = 0.75,
  stopMonitoringEventLoop$: Observable<void>,
  collectionStartDelay = MONITOR_EVENT_LOOP_UTILIZATION_START,
  collectionInterval = MONITOR_EVENT_LOOP_UTILIZATION_INTERVAL
) {
  const eventLoopUtilizationCollector = new EventLoopUtlizationCollector();
  const eventLoopUtilizationCounter = usageCollection.getUsageCounterByType('eventLoopUtilization');

  timer(collectionStartDelay, collectionInterval)
    .pipe(takeUntil(stopMonitoringEventLoop$))
    .subscribe(async () => {
      const { active, utilization, idle } = eventLoopUtilizationCollector.collect();

      if (utilization > utilizationThreshold) {
        logger.warn(
          `Eventloop delay threshold exceeded. Utilization: ${
            utilization * 100
          }%. Idle: ${idle}ms. Active: ${active}ms.`
        );
        eventLoopUtilizationCounter?.incrementCounter({
          counterName: 'utilization_threshold_exceeded',
        });
      }

      eventLoopUtilizationCollector.reset();
    });
}
