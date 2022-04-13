/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IntervalHistogram as PerfIntervalHistogram } from 'perf_hooks';
import { monitorEventLoopDelay } from 'perf_hooks';
import type { IntervalHistogram } from '../types';

/**
 * Nanosecond to milisecond conversion unit
 */
export const ONE_MILLISECOND_AS_NANOSECONDS = 1_000_000;

/**
 * Converts time metric from ns to ms
 **/
export function nsToMs(metric: number) {
  return metric / ONE_MILLISECOND_AS_NANOSECONDS;
}

export class EventLoopDelaysMonitor {
  private readonly loopMonitor: PerfIntervalHistogram;
  private fromTimestamp: Date;

  /**
   * Creating a new instance from EventLoopDelaysMonitor will
   * automatically start tracking event loop delays.
   */
  constructor() {
    const monitor = monitorEventLoopDelay();
    monitor.enable();
    this.fromTimestamp = new Date();
    this.loopMonitor = monitor;
  }
  /**
   * Collect gathers event loop delays metrics from nodejs perf_hooks.monitorEventLoopDelay
   * the histogram calculations start from the last time `reset` was called or this
   * EventLoopDelaysMonitor instance was created.
   *
   * Returns metrics in milliseconds.

   * @returns {IntervalHistogram}
   */

  public collect(): IntervalHistogram {
    const lastUpdated = new Date();
    this.loopMonitor.disable();
    const {
      min: minNs,
      max: maxNs,
      mean: meanNs,
      exceeds: exceedsNs,
      stddev: stddevNs,
    } = this.loopMonitor;

    const collectedData: IntervalHistogram = {
      min: nsToMs(minNs),
      max: nsToMs(maxNs),
      mean: nsToMs(meanNs),
      exceeds: nsToMs(exceedsNs),
      stddev: nsToMs(stddevNs),
      fromTimestamp: this.fromTimestamp.toISOString(),
      lastUpdatedAt: lastUpdated.toISOString(),
      percentiles: {
        50: nsToMs(this.loopMonitor.percentile(50)),
        75: nsToMs(this.loopMonitor.percentile(75)),
        95: nsToMs(this.loopMonitor.percentile(95)),
        99: nsToMs(this.loopMonitor.percentile(99)),
      },
    };

    this.loopMonitor.enable();
    return collectedData;
  }

  /**
   * Resets the collected histogram data.
   */
  public reset() {
    this.loopMonitor.reset();
    this.fromTimestamp = new Date();
  }

  /**
   * Disables updating the interval timer for collecting new data points.
   */
  public stop() {
    this.loopMonitor.disable();
  }
}
