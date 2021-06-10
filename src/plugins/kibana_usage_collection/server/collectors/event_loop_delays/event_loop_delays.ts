/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EventLoopDelayMonitor } from 'perf_hooks';
import { monitorEventLoopDelay } from 'perf_hooks';
import { takeUntil, finalize, map } from 'rxjs/operators';
import { Observable, timer } from 'rxjs';
import type { ISavedObjectsRepository } from 'kibana/server';
import {
  MONITOR_EVENT_LOOP_DELAYS_START,
  MONITOR_EVENT_LOOP_DELAYS_INTERVAL,
  MONITOR_EVENT_LOOP_DELAYS_RESET,
  MONITOR_EVENT_LOOP_DELAYS_RESOLUTION,
} from './constants';
import { storeHistogram } from './saved_objects';

export interface IntervalHistogram {
  min: number;
  max: number;
  mean: number;
  exceeds: number;
  stddev: number;
  percentiles: {
    50: number;
    75: number;
    95: number;
    99: number;
  };
}

export class EventLoopDelaysCollector {
  private readonly loopMonitor: EventLoopDelayMonitor;
  constructor() {
    const monitor = monitorEventLoopDelay({
      resolution: MONITOR_EVENT_LOOP_DELAYS_RESOLUTION,
    });
    monitor.enable();
    this.loopMonitor = monitor;
  }

  public collect(): IntervalHistogram {
    const { min, max, mean, exceeds, stddev } = this.loopMonitor;

    return {
      min,
      max,
      mean,
      exceeds,
      stddev,
      percentiles: {
        50: this.loopMonitor.percentile(50),
        75: this.loopMonitor.percentile(75),
        95: this.loopMonitor.percentile(95),
        99: this.loopMonitor.percentile(99),
      },
    };
  }

  public reset() {
    this.loopMonitor.reset();
  }
  public stop() {
    this.loopMonitor.disable();
  }
}

/**
 * The monitoring of the event loop starts immediately.
 * The first collection of the histogram happens after 1 minute.
 * The daily histogram data is updated every 1 hour.
 */
export function startTrackingEventLoopDelaysUsage(
  internalRepository: ISavedObjectsRepository,
  stopMonitoringEventLoop$: Observable<void>,
  collectionStartDelay = MONITOR_EVENT_LOOP_DELAYS_START,
  collectionInterval = MONITOR_EVENT_LOOP_DELAYS_INTERVAL,
  histogramReset = MONITOR_EVENT_LOOP_DELAYS_RESET
) {
  const eventLoopDelaysCollector = new EventLoopDelaysCollector();

  const resetOnCount = parseInt(`${histogramReset / collectionInterval}`, 10);
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
