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

import { Subject } from 'rxjs';
import {
  CollectorOptions,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/usage_collection.mock';

import { registerOpsStatsCollector } from './';
import { OpsMetrics } from '../../../../../core/server';

describe('telemetry_ops_stats', () => {
  let collector: CollectorOptions;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeStatsCollector.mockImplementation((config) => {
    collector = config;
    return createUsageCollectionSetupMock().makeStatsCollector(config);
  });

  const metrics$ = new Subject<OpsMetrics>();
  const callCluster = jest.fn();

  const metric: OpsMetrics = {
    process: {
      memory: {
        heap: {
          total_in_bytes: 0,
          used_in_bytes: 0,
          size_limit: 0,
        },
        resident_set_size_in_bytes: 0,
      },
      event_loop_delay: 10,
      pid: 10,
      uptime_in_millis: 1000,
    },
    os: {
      platform: 'darwin',
      platformRelease: 'test',
      load: {
        '1m': 0.5,
        '5m': 1,
        '15m': 3,
      },
      memory: {
        total_in_bytes: 10,
        free_in_bytes: 10,
        used_in_bytes: 10,
      },
      uptime_in_millis: 1000,
    },
    response_times: { avg_in_millis: 100, max_in_millis: 200 },
    requests: {
      disconnects: 10,
      total: 100,
      statusCodes: { 200: 100 },
    },
    concurrent_connections: 20,
  };

  beforeAll(() => registerOpsStatsCollector(usageCollectionMock, metrics$));
  afterAll(() => jest.clearAllTimers());

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
    expect(collector.type).toBe('kibana_stats');
  });

  test('isReady should return false because no metrics have been provided yet', () => {
    expect(collector.isReady()).toBe(false);
  });

  test('should return something when there is a metric', async () => {
    metrics$.next(metric);
    expect(collector.isReady()).toBe(true);
    expect(await collector.fetch(callCluster)).toMatchSnapshot({
      concurrent_connections: 20,
      os: {
        load: {
          '15m': 3,
          '1m': 0.5,
          '5m': 1,
        },
        memory: {
          free_in_bytes: 10,
          total_in_bytes: 10,
          used_in_bytes: 10,
        },
        platform: 'darwin',
        platformRelease: 'test',
        uptime_in_millis: 1000,
      },
      process: {
        event_loop_delay: 10,
        memory: {
          heap: {
            size_limit: 0,
            total_in_bytes: 0,
            used_in_bytes: 0,
          },
          resident_set_size_in_bytes: 0,
        },
        uptime_in_millis: 1000,
      },
      requests: {
        disconnects: 10,
        total: 100,
      },
      response_times: {
        average: 100,
        max: 200,
      },
      timestamp: expect.any(String),
    });
  });
});
