/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { registerSavedObjectsCountUsageCollector } from './saved_objects_count_collector';

describe('saved_objects_count_collector', () => {
  const usageCollectionMock = createUsageCollectionSetupMock();

  const kibanaIndex = '.kibana-tests';

  beforeAll(() => registerSavedObjectsCountUsageCollector(usageCollectionMock, kibanaIndex));
  afterAll(() => jest.clearAllTimers());

  test('registered collector is set', () => {
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalled();
    expect(usageCollectionMock.registerCollector).toHaveBeenCalled();
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe(
      'saved_objects_counts'
    );
  });

  test('should return an empty array when no results are returned', async () => {
    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    expect(await collector.fetch(createCollectorFetchContextMock())).toStrictEqual({
      by_type: [],
    });
  });

  test('should return some values when the aggregations return something', async () => {
    const fetchContextMock = createCollectorFetchContextMock();
    fetchContextMock.esClient.search = jest.fn().mockImplementation(() => ({
      aggregations: {
        types: {
          buckets: [
            { key: 'type_one', doc_count: 20 },
            { key: 'type_two', doc_count: 45 },
            { key: 'type-three', doc_count: 66 },
            { key: 'type-four', doc_count: 0 },
          ],
        },
      },
    }));

    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    expect(await collector.fetch(fetchContextMock)).toStrictEqual({
      by_type: [
        { type: 'type_one', count: 20 },
        { type: 'type_two', count: 45 },
        { type: 'type-three', count: 66 },
        { type: 'type-four', count: 0 },
      ],
    });
  });
});
