/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { mockStats, mockGetStats } from './get_usage_collector.mock';
import { registerVegaUsageCollector } from './register_vega_collector';

import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { ConfigObservable } from '../types';

describe('registerVegaUsageCollector', () => {
  const mockDeps = { home: {} as unknown as HomeServerPluginSetup };
  const mockConfig = {} as ConfigObservable;

  test('makes a usage collector and registers it`', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVegaUsageCollector(mockCollectorSet, mockConfig, mockDeps);
    expect(mockCollectorSet.makeUsageCollector).toBeCalledTimes(1);
    expect(mockCollectorSet.registerCollector).toBeCalledTimes(1);
  });

  test('makeUsageCollector configs fit the shape', () => {
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

  test('makeUsageCollector config.isReady returns true', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVegaUsageCollector(mockCollectorSet, mockConfig, mockDeps);
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  test('makeUsageCollector config.fetch calls getStats', async () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVegaUsageCollector(mockCollectorSet, mockConfig, mockDeps);
    const usageCollector = mockCollectorSet.makeUsageCollector.mock.results[0].value;
    const mockedCollectorFetchContext = createCollectorFetchContextMock();
    const fetchResult = await usageCollector.fetch(mockedCollectorFetchContext);
    expect(mockGetStats).toBeCalledTimes(1);
    expect(mockGetStats).toBeCalledWith(mockedCollectorFetchContext.soClient, mockDeps);
    expect(fetchResult).toBe(mockStats);
  });
});
