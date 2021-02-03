/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import v8, { HeapInfo } from 'v8';
import { ProcessMetricsCollector } from './process';

describe('ProcessMetricsCollector', () => {
  let collector: ProcessMetricsCollector;

  beforeEach(() => {
    collector = new ProcessMetricsCollector();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('collects pid from the process', async () => {
    const metrics = await collector.collect();

    expect(metrics.pid).toEqual(process.pid);
  });

  it('collects event loop delay', async () => {
    const metrics = await collector.collect();

    expect(metrics.event_loop_delay).toBeGreaterThan(0);
  });

  it('collects uptime info from the process', async () => {
    const uptime = 58986;
    jest.spyOn(process, 'uptime').mockImplementation(() => uptime);

    const metrics = await collector.collect();

    expect(metrics.uptime_in_millis).toEqual(uptime * 1000);
  });

  it('collects memory info from the process', async () => {
    const heapTotal = 58986;
    const heapUsed = 4688;
    const heapSizeLimit = 5788;
    const rss = 5865;
    jest.spyOn(process, 'memoryUsage').mockImplementation(() => ({
      rss,
      heapTotal,
      heapUsed,
      external: 0,
      arrayBuffers: 0,
    }));

    jest.spyOn(v8, 'getHeapStatistics').mockImplementation(
      () =>
        ({
          heap_size_limit: heapSizeLimit,
        } as HeapInfo)
    );

    const metrics = await collector.collect();

    expect(metrics.memory.heap.total_in_bytes).toEqual(heapTotal);
    expect(metrics.memory.heap.used_in_bytes).toEqual(heapUsed);
    expect(metrics.memory.heap.size_limit).toEqual(heapSizeLimit);
    expect(metrics.memory.resident_set_size_in_bytes).toEqual(rss);
  });
});
