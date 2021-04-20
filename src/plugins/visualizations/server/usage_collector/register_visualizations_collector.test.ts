/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { mockStats, mockGetStats } from './get_usage_collector.mock';
import { createUsageCollectionSetupMock } from 'src/plugins/usage_collection/server/mocks';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';

import { registerVisualizationsCollector } from './register_visualizations_collector';

describe('registerVisualizationsCollector', () => {
  const mockIndex = 'mock_index';
  const mockConfig = of({ kibana: { index: mockIndex } });

  it('makes a usage collector and registers it`', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisualizationsCollector(mockCollectorSet, mockConfig);
    expect(mockCollectorSet.makeUsageCollector).toBeCalledTimes(1);
    expect(mockCollectorSet.registerCollector).toBeCalledTimes(1);
  });

  it('makeUsageCollector configs fit the shape', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisualizationsCollector(mockCollectorSet, mockConfig);
    expect(mockCollectorSet.makeUsageCollector).toHaveBeenCalledWith({
      type: 'visualization_types',
      isReady: expect.any(Function),
      fetch: expect.any(Function),
      schema: expect.any(Object),
    });
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  it('makeUsageCollector config.isReady returns true', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisualizationsCollector(mockCollectorSet, mockConfig);
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  it('makeUsageCollector config.fetch calls getStats', async () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisualizationsCollector(mockCollectorSet, mockConfig);
    const usageCollector = mockCollectorSet.makeUsageCollector.mock.results[0].value;
    const mockCollectorFetchContext = createCollectorFetchContextMock();
    const fetchResult = await usageCollector.fetch(mockCollectorFetchContext);
    expect(mockGetStats).toBeCalledTimes(1);
    expect(mockGetStats).toBeCalledWith(mockCollectorFetchContext.esClient, mockIndex);
    expect(fetchResult).toBe(mockStats);
  });
});
