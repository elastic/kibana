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

import v8 from 'v8';
import { Bench } from 'hoek';
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
