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
import { registerVisTypeTableUsageCollector } from './register_usage_collector';
import { getStats } from './get_stats';

jest.mock('./get_stats', () => ({
  getStats: jest.fn().mockResolvedValue({ somestat: 1 }),
}));

describe('registerVisTypeTableUsageCollector', () => {
  test('Usage collector configs fit the shape', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisTypeTableUsageCollector(mockCollectorSet);
    expect(mockCollectorSet.makeUsageCollector).toBeCalledTimes(1);
    expect(mockCollectorSet.registerCollector).toBeCalledTimes(1);
    expect(mockCollectorSet.makeUsageCollector).toHaveBeenCalledWith({
      type: 'vis_type_table',
      isReady: expect.any(Function),
      fetch: expect.any(Function),
      schema: {
        total: { type: 'long' },
        total_split: { type: 'long' },
        split_columns: {
          total: { type: 'long' },
          enabled: { type: 'long' },
        },
        split_rows: {
          total: { type: 'long' },
          enabled: { type: 'long' },
        },
      },
    });
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  test('Usage collector config.fetch calls getStats', async () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisTypeTableUsageCollector(mockCollectorSet);
    const usageCollector = mockCollectorSet.makeUsageCollector.mock.results[0].value;
    const mockCollectorFetchContext = createCollectorFetchContextMock();
    const fetchResult = await usageCollector.fetch(mockCollectorFetchContext);
    expect(getStats).toBeCalledTimes(1);
    expect(getStats).toBeCalledWith(mockCollectorFetchContext.soClient);
    expect(fetchResult).toEqual({ somestat: 1 });
  });
});
