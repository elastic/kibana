/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import v8, { HeapInfo } from 'v8';
import { mockEventLoopDelayMonitor, mockEventLoopUtilizationMonitor } from './process.test.mocks';
import { ProcessMetricsCollector } from './process';

describe('ProcessMetricsCollector', () => {
  let collector: ProcessMetricsCollector;

  beforeEach(() => {
    collector = new ProcessMetricsCollector();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#collect', () => {
    it('collects pid from the process', () => {
      const metrics = collector.collect();

      expect(metrics).toHaveLength(1);
      expect(metrics[0].pid).toEqual(process.pid);
    });

    it('collects event loop delay', () => {
      mockEventLoopDelayMonitor.collect.mockReturnValueOnce({ mean: 13, max: 18 });
      const metrics = collector.collect();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].event_loop_delay).toBe(18);
      expect(mockEventLoopDelayMonitor.collect).toBeCalledTimes(1);
    });

    it('collects event loop utilization', () => {
      const mockData = { active: 1, idle: 1, utilization: 1 };
      mockEventLoopUtilizationMonitor.collect.mockReturnValueOnce(mockData);
      const metrics = collector.collect();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].event_loop_utilization).toEqual(mockData);
      expect(mockEventLoopUtilizationMonitor.collect).toBeCalledTimes(1);
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
      const external = 9001;
      const arrayBuffers = 42;

      jest.spyOn(process, 'memoryUsage').mockImplementation(() => ({
        rss,
        heapTotal,
        heapUsed,
        external,
        arrayBuffers,
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
      expect(metrics[0].memory.external_in_bytes).toEqual(external);
      expect(metrics[0].memory.array_buffers_in_bytes).toEqual(arrayBuffers);
    });
  });

  describe('#reset', () => {
    it('resets event loop delay', () => {
      collector.reset();
      expect(mockEventLoopDelayMonitor.reset).toBeCalledTimes(1);
    });

    it('resets event loop utilization', () => {
      collector.reset();
      expect(mockEventLoopUtilizationMonitor.reset).toBeCalledTimes(1);
    });
  });
});
