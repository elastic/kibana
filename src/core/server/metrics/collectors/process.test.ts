/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
