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

import { of } from 'rxjs';
import { mockStats, mockGetStats } from './get_usage_collector.mock';
import { createUsageCollectionSetupMock } from 'src/plugins/usage_collection/server/usage_collection.mock';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import { HomeServerPluginSetup } from '../../../home/server';
import { registerVegaUsageCollector } from './register_vega_collector';

describe('registerVegaUsageCollector', () => {
  const mockIndex = 'mock_index';
  const mockDeps = { home: ({} as unknown) as HomeServerPluginSetup };
  const mockConfig = of({ kibana: { index: mockIndex } });

  it('makes a usage collector and registers it`', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVegaUsageCollector(mockCollectorSet, mockConfig, mockDeps);
    expect(mockCollectorSet.makeUsageCollector).toBeCalledTimes(1);
    expect(mockCollectorSet.registerCollector).toBeCalledTimes(1);
  });

  it('makeUsageCollector configs fit the shape', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVegaUsageCollector(mockCollectorSet, mockConfig, mockDeps);
    expect(mockCollectorSet.makeUsageCollector).toHaveBeenCalledWith({
      type: 'vis_type_vega',
      isReady: expect.any(Function),
      fetch: expect.any(Function),
      schema: expect.any(Object),
    });
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  it('makeUsageCollector config.isReady returns true', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVegaUsageCollector(mockCollectorSet, mockConfig, mockDeps);
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  it('makeUsageCollector config.fetch calls getStats', async () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVegaUsageCollector(mockCollectorSet, mockConfig, mockDeps);
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    const mockedCollectorFetchContext = createCollectorFetchContextMock();
    const fetchResult = await usageCollectorConfig.fetch(mockedCollectorFetchContext);
    expect(mockGetStats).toBeCalledTimes(1);
    expect(mockGetStats).toBeCalledWith(
      mockedCollectorFetchContext.callCluster,
      mockIndex,
      mockDeps
    );
    expect(fetchResult).toBe(mockStats);
  });
});
