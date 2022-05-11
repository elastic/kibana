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
import { registerVisualizationsCollector } from './register_visualizations_collector';

describe('registerVisualizationsCollector', () => {
  test('makes a usage collector and registers it`', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisualizationsCollector(mockCollectorSet);
    expect(mockCollectorSet.makeUsageCollector).toBeCalledTimes(1);
    expect(mockCollectorSet.registerCollector).toBeCalledTimes(1);
  });

  test('makeUsageCollector configs fit the shape', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisualizationsCollector(mockCollectorSet);
    expect(mockCollectorSet.makeUsageCollector).toHaveBeenCalledWith({
      type: 'visualization_types',
      isReady: expect.any(Function),
      fetch: expect.any(Function),
      schema: expect.any(Object),
    });
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  test('makeUsageCollector config.isReady returns true', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisualizationsCollector(mockCollectorSet);
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  test('makeUsageCollector config.fetch calls getStats', async () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisualizationsCollector(mockCollectorSet);
    const usageCollector = mockCollectorSet.makeUsageCollector.mock.results[0].value;
    const mockCollectorFetchContext = createCollectorFetchContextMock();
    const fetchResult = await usageCollector.fetch(mockCollectorFetchContext);
    expect(mockGetStats).toBeCalledTimes(1);
    expect(mockGetStats).toBeCalledWith(mockCollectorFetchContext.soClient);
    expect(fetchResult).toBe(mockStats);
  });
});
