/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EventLoopDelayMonitor } from 'perf_hooks';
import { monitorEventLoopDelay } from 'perf_hooks';

export interface IntervalHistogram {
  fromTimestamp: string;
  lastUpdatedAt: string;
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

export class EventLoopDelaysMonitor {
  private readonly loopMonitor: EventLoopDelayMonitor;
  private fromTimestamp: Date;

  constructor() {
    const monitor = monitorEventLoopDelay();
    monitor.enable();
    this.fromTimestamp = new Date();
    this.loopMonitor = monitor;
  }

  public collect(): IntervalHistogram {
    const lastUpdated = new Date();
    this.loopMonitor.disable();
    const { min, max, mean, exceeds, stddev } = this.loopMonitor;

    const collectedData: IntervalHistogram = {
      min,
      max,
      mean,
      exceeds,
      stddev,
      fromTimestamp: this.fromTimestamp.toISOString(),
      lastUpdatedAt: lastUpdated.toISOString(),
      percentiles: {
        50: this.loopMonitor.percentile(50),
        75: this.loopMonitor.percentile(75),
        95: this.loopMonitor.percentile(95),
        99: this.loopMonitor.percentile(99),
      },
    };

    this.loopMonitor.enable();
    return collectedData;
  }

  public reset() {
    this.loopMonitor.reset();
    this.fromTimestamp = new Date();
  }

  public stop() {
    this.loopMonitor.disable();
  }
}
