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

import { BehaviorSubject } from 'rxjs';
import {
  coreMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '../../../core/server/mocks';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { plugin } from './';

describe('kibana_usage_collection', () => {
  const pluginInstance = plugin(coreMock.createPluginInitializerContext({}));

  const usageCollectors: Array<{ isReady: () => boolean }> = [];

  const usageCollection: jest.Mocked<UsageCollectionSetup> = {
    makeStatsCollector: jest.fn().mockImplementation((opts) => {
      usageCollectors.push(opts);
      return opts;
    }),
    makeUsageCollector: jest.fn().mockImplementation((opts) => {
      usageCollectors.push(opts);
      return opts;
    }),
    registerCollector: jest.fn(),
  } as any;

  test('Runs the setup method without issues', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.metrics.getOpsMetrics$.mockImplementation(
      () =>
        new BehaviorSubject({
          process: {
            memory: {
              heap: { total_in_bytes: 1, used_in_bytes: 1, size_limit: 1 },
              resident_set_size_in_bytes: 1,
            },
            event_loop_delay: 1,
            pid: 1,
            uptime_in_millis: 1,
          },
          os: {
            platform: 'darwin' as const,
            platformRelease: 'test',
            load: { '1m': 1, '5m': 1, '15m': 1 },
            memory: { total_in_bytes: 1, free_in_bytes: 1, used_in_bytes: 1 },
            uptime_in_millis: 1,
          },
          response_times: { avg_in_millis: 1, max_in_millis: 1 },
          requests: { disconnects: 1, total: 1, statusCodes: { '200': 1 } },
          concurrent_connections: 1,
        })
    );

    expect(pluginInstance.setup(coreSetup, { usageCollection })).toBe(undefined);
    usageCollectors.forEach(({ isReady }) => {
      expect(isReady()).toMatchSnapshot(); // Some should return false at this stage
    });
  });

  test('Runs the start method without issues', () => {
    const coreStart = coreMock.createStart();
    coreStart.savedObjects.createInternalRepository.mockImplementation(() =>
      savedObjectsRepositoryMock.create()
    );
    coreStart.uiSettings.asScopedToClient.mockImplementation(() =>
      uiSettingsServiceMock.createClient()
    );
    expect(pluginInstance.start(coreStart)).toBe(undefined);
    usageCollectors.forEach(({ isReady }) => {
      expect(isReady()).toBe(true); // All should return true at this point
    });
  });

  test('Runs the stop method without issues', () => {
    expect(pluginInstance.stop()).toBe(undefined);
  });
});
