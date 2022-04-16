/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockStats, mockGetStats } from './get_usage_collector.mock';
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';
import { registerTimeseriesUsageCollector } from './register_timeseries_collector';

describe('registerTimeseriesUsageCollector', () => {
  it('makes a usage collector and registers it`', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerTimeseriesUsageCollector(mockCollectorSet);
    expect(mockCollectorSet.makeUsageCollector).toBeCalledTimes(1);
    expect(mockCollectorSet.registerCollector).toBeCalledTimes(1);
  });

  it('makeUsageCollector configs fit the shape', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerTimeseriesUsageCollector(mockCollectorSet);
    expect(mockCollectorSet.makeUsageCollector).toHaveBeenCalledWith({
      type: 'vis_type_timeseries',
      isReady: expect.any(Function),
      fetch: expect.any(Function),
      schema: expect.any(Object),
    });
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  it('makeUsageCollector config.isReady returns true', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerTimeseriesUsageCollector(mockCollectorSet);
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  it('makeUsageCollector config.fetch calls getStats', async () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerTimeseriesUsageCollector(mockCollectorSet);
    const usageCollector = mockCollectorSet.makeUsageCollector.mock.results[0].value;
    const mockedCollectorFetchContext = createCollectorFetchContextMock();
    const fetchResult = await usageCollector.fetch(mockedCollectorFetchContext);
    expect(mockGetStats).toBeCalledTimes(1);
    expect(mockGetStats).toBeCalledWith(mockedCollectorFetchContext.soClient, undefined);
    expect(fetchResult).toBe(mockStats);
  });
});
