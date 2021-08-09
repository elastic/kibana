/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import v8 from 'v8';
import { OpsProcessMetrics, MetricsCollector } from './types';
import { EventLoopDelaysMonitor } from '../event_loop_delays';

export const MAIN_THREAD_PROCESS_NAME = 'main_thread';

export class ProcessMetricsCollector implements MetricsCollector<OpsProcessMetrics[]> {
  static getMainThreadMetrics(processes: OpsProcessMetrics[]): undefined | OpsProcessMetrics {
    return processes.find(({ name }) => name === MAIN_THREAD_PROCESS_NAME);
  }

  private readonly eventLoopDelayMonitor = new EventLoopDelaysMonitor();

  private getCurrentPidMetrics(): OpsProcessMetrics {
    const eventLoopDelayHistogram = this.eventLoopDelayMonitor.collect();
    const heapStats = v8.getHeapStatistics();
    const memoryUsage = process.memoryUsage();

    return {
      name: MAIN_THREAD_PROCESS_NAME,
      memory: {
        heap: {
          total_in_bytes: memoryUsage.heapTotal,
          used_in_bytes: memoryUsage.heapUsed,
          size_limit: heapStats.heap_size_limit,
        },
        resident_set_size_in_bytes: memoryUsage.rss,
      },
      pid: process.pid,
      event_loop_delay: eventLoopDelayHistogram.mean,
      event_loop_delay_histogram: eventLoopDelayHistogram,
      uptime_in_millis: process.uptime() * 1000,
    };
  }

  public collect(): OpsProcessMetrics[] {
    return [this.getCurrentPidMetrics()];
  }

  public reset() {
    this.eventLoopDelayMonitor.reset();
  }
}
