/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import v8, { HeapInfo } from 'v8';
import { ProcessMetricsCollector } from './process';

/* eslint-disable dot-notation */
describe('ProcessMetricsCollector', () => {
  let collector: ProcessMetricsCollector;

  beforeEach(() => {
    collector = new ProcessMetricsCollector();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('collects pid from the process', () => {
    const metrics = collector.collect();

    expect(metrics).toHaveLength(1);
    expect(metrics[0].pid).toEqual(process.pid);
  });

  it('collects event loop delay', () => {
    const mockEventLoopDelayMonitor = { collect: jest.fn().mockReturnValue({ mean: 13 }) };
    // @ts-expect-error-next-line readonly private method.
    collector['eventLoopDelayMonitor'] = mockEventLoopDelayMonitor;
    const metrics = collector.collect();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].event_loop_delay).toBe(13);
    expect(mockEventLoopDelayMonitor.collect).toBeCalledTimes(1);
  });

  it('collects uptime info from the process', () => {
    const uptime = 58986;
    jest.spyOn(process, 'uptime').mockImplementation(() => uptime);

    const metrics = collector.collect();

    expect(metrics).toHaveLength(1);
    expect(metrics[0].uptime_in_millis).toEqual(uptime * 1000);
  });

  it('collects memory info from the process', () => {
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

    const metrics = collector.collect();

    expect(metrics).toHaveLength(1);
    expect(metrics[0].memory.heap.total_in_bytes).toEqual(heapTotal);
    expect(metrics[0].memory.heap.used_in_bytes).toEqual(heapUsed);
    expect(metrics[0].memory.heap.size_limit).toEqual(heapSizeLimit);
    expect(metrics[0].memory.resident_set_size_in_bytes).toEqual(rss);
  });
});
