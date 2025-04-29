/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { getSavedObjectsCountsMock } from './saved_objects_count.test.mocks';
import { registerSavedObjectsCountUsageCollector } from './saved_objects_count_collector';

describe('saved_objects_count_collector', () => {
  const usageCollectionMock = createUsageCollectionSetupMock();
  const fetchContextMock = createCollectorFetchContextMock();
  const mockGetSoClientWithHiddenIndices = jest.fn().mockResolvedValue(fetchContextMock.soClient);

  beforeAll(() =>
    registerSavedObjectsCountUsageCollector(
      usageCollectionMock,
      () => Promise.resolve(['type_one', 'type_two', 'type-three', 'type-four']),
      mockGetSoClientWithHiddenIndices
    )
  );
  afterAll(() => jest.clearAllTimers());

  afterEach(() => {
    getSavedObjectsCountsMock.mockReset();
    mockGetSoClientWithHiddenIndices.mockClear();
  });

  test('registered collector is set', () => {
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalled();
    expect(usageCollectionMock.registerCollector).toHaveBeenCalled();
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe(
      'saved_objects_counts'
    );
  });

  test('should return an empty array when no results are returned', async () => {
    getSavedObjectsCountsMock.mockResolvedValueOnce({
      total: 0,
      per_type: [],
      non_expected_types: [],
      others: 0,
    });
    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    expect(await collector.fetch(fetchContextMock)).toStrictEqual({
      by_type: [],
      total: 0,
      non_registered_types: [],
      others: 0,
    });

    expect(mockGetSoClientWithHiddenIndices).toBeCalledTimes(1);
  });

  test('should return some values when the aggregations return something', async () => {
    getSavedObjectsCountsMock.mockResolvedValueOnce({
      total: 153,
      others: 10,
      per_type: [
        { key: 'type_one', doc_count: 20 },
        { key: 'type_two', doc_count: 45 },
        { key: 'type-three', doc_count: 66 },
        { key: 'missing_so_type', doc_count: 10 },
        { key: 'type-unregistered', doc_count: 3 },
      ],
      non_expected_types: ['type-unregistered'],
    });

    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    expect(await collector.fetch(fetchContextMock)).toStrictEqual({
      others: 10,
      non_registered_types: ['type-unregistered'],
      by_type: [
        { type: 'type_one', count: 20 },
        { type: 'type_two', count: 45 },
        { type: 'type-three', count: 66 },
        { type: 'missing_so_type', count: 10 },
        { type: 'type-unregistered', count: 3 },
      ],
      total: 153,
    });

    expect(mockGetSoClientWithHiddenIndices).toBeCalledTimes(1);
    expect(getSavedObjectsCountsMock).toHaveBeenCalledWith(
      fetchContextMock.soClient,
      ['type_one', 'type_two', 'type-three', 'type-four'],
      { exclusive: false, namespaces: ['*'] }
    );
  });
});
