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

import { Observable } from 'rxjs';
import { coreMock } from '../../../core/server/mocks';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { plugin } from './';

describe('kibana_usage_collection', () => {
  const pluginInstance = plugin(coreMock.createPluginInitializerContext({}));

  const usageCollectors: Array<{ isReady: () => boolean }> = [];

  const usageCollection: jest.Mocked<UsageCollectionSetup> = {
    makeStatsCollector: jest.fn().mockImplementation(opts => {
      usageCollectors.push(opts);
      return opts;
    }),
    makeUsageCollector: jest.fn().mockImplementation(opts => {
      usageCollectors.push(opts);
      return opts;
    }),
    registerCollector: jest.fn(),
  } as any;

  test('Runs the setup method without issues', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.metrics.getOpsMetrics$.mockImplementation(() => new Observable());
    expect(pluginInstance.setup(coreSetup, { usageCollection })).toBe(undefined);
    usageCollectors.forEach(({ isReady }) => {
      expect(isReady()).toMatchSnapshot(); // Some should return false at this stage
    });
  });

  test('Runs the start method without issues', () => {
    expect(pluginInstance.start(coreMock.createStart())).toBe(undefined);
    usageCollectors.forEach(({ isReady }) => {
      expect(isReady()).toBe(true); // All should return true at this point
    });
  });

  test('Runs the stop method without issues', () => {
    expect(pluginInstance.stop()).toBe(undefined);
  });
});
