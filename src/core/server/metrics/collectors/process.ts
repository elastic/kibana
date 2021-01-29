/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import v8 from 'v8';
import { Bench } from '@hapi/hoek';
import { OpsProcessMetrics, MetricsCollector } from './types';

export class ProcessMetricsCollector implements MetricsCollector<OpsProcessMetrics> {
  public async collect(): Promise<OpsProcessMetrics> {
    const heapStats = v8.getHeapStatistics();
    const memoryUsage = process.memoryUsage();
    const [eventLoopDelay] = await Promise.all([getEventLoopDelay()]);
    return {
      memory: {
        heap: {
          total_in_bytes: memoryUsage.heapTotal,
          used_in_bytes: memoryUsage.heapUsed,
          size_limit: heapStats.heap_size_limit,
        },
        resident_set_size_in_bytes: memoryUsage.rss,
      },
      pid: process.pid,
      event_loop_delay: eventLoopDelay,
      uptime_in_millis: process.uptime() * 1000,
    };
  }

  public reset() {}
}

const getEventLoopDelay = (): Promise<number> => {
  const bench = new Bench();
  return new Promise((resolve) => {
    setImmediate(() => {
      return resolve(bench.elapsed());
    });
  });
};
