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

jest.mock('./get_stats', () => ({
  getStats: jest.fn().mockResolvedValue({ somestat: 1 }),
}));

import { of } from 'rxjs';
import { createUsageCollectionSetupMock } from 'src/plugins/usage_collection/server/usage_collection.mock';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';

import { registerVisTypeTableUsageCollector } from './register_usage_collector';
import { getStats } from './get_stats';

describe('registerVisTypeTableUsageCollector', () => {
  const mockIndex = 'mock_index';
  const mockConfig = of({ kibana: { index: mockIndex } });

  it('Usage collector configs fit the shape', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisTypeTableUsageCollector(mockCollectorSet, mockConfig);
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

  it('Usage collector config.fetch calls getStats', async () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerVisTypeTableUsageCollector(mockCollectorSet, mockConfig);
    const usageCollector = mockCollectorSet.makeUsageCollector.mock.results[0].value;
    const mockCollectorFetchContext = createCollectorFetchContextMock();
    const fetchResult = await usageCollector.fetch(mockCollectorFetchContext);
    expect(getStats).toBeCalledTimes(1);
    expect(getStats).toBeCalledWith(mockCollectorFetchContext.esClient, mockIndex);
    expect(fetchResult).toEqual({ somestat: 1 });
  });
});
