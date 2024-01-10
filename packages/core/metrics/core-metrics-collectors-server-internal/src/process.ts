/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import v8 from 'v8';
import type { OpsProcessMetrics, MetricsCollector } from '@kbn/core-metrics-server';
import { EventLoopDelaysMonitor } from './event_loop_delays_monitor';
import { EventLoopUtilizationMonitor } from './event_loop_utilization_monitor';

export class ProcessMetricsCollector implements MetricsCollector<OpsProcessMetrics[]> {
  static getMainThreadMetrics(processes: OpsProcessMetrics[]): undefined | OpsProcessMetrics {
    /**
     * Currently Kibana does not support multi-processes.
     * Once we have multiple processes we can add a `name` field
     * and filter on `name === 'server_worker'` to get the main thread.
     */
    return processes[0];
  }

  private readonly eventLoopDelayMonitor = new EventLoopDelaysMonitor();
  private readonly eventLoopUtilizationMonitor = new EventLoopUtilizationMonitor();

  private getCurrentPidMetrics(): OpsProcessMetrics {
    const eventLoopDelayHistogram = this.eventLoopDelayMonitor.collect();
    const eventLoopUtilization = this.eventLoopUtilizationMonitor.collect();
    const heapStats = v8.getHeapStatistics();
    const memoryUsage = process.memoryUsage();

    return {
      memory: {
        heap: {
          total_in_bytes: memoryUsage.heapTotal,
          used_in_bytes: memoryUsage.heapUsed,
          size_limit: heapStats.heap_size_limit,
        },
        resident_set_size_in_bytes: memoryUsage.rss,
        array_buffers_in_bytes: memoryUsage.arrayBuffers,
        external_in_bytes: memoryUsage.external,
      },
      pid: process.pid,
      event_loop_delay: eventLoopDelayHistogram.mean,
      event_loop_delay_histogram: eventLoopDelayHistogram,
      event_loop_utilization: eventLoopUtilization,
      uptime_in_millis: process.uptime() * 1000,
    };
  }

  public collect(): OpsProcessMetrics[] {
    return [this.getCurrentPidMetrics()];
  }

  public reset() {
    this.eventLoopDelayMonitor.reset();
    this.eventLoopUtilizationMonitor.reset();
  }
}
