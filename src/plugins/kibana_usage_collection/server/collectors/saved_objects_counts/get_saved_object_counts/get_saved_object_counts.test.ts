/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getSavedObjectsCounts } from './get_saved_object_counts';

function mockGetSavedObjectsCounts<TBody>(params: TBody) {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error arbitrary type
  esClient.search.mockResponse(params);
  return esClient;
}

describe('getSavedObjectsCounts', () => {
  test('should not fail if no body returned', async () => {
    const esClient = mockGetSavedObjectsCounts({});

    const results = await getSavedObjectsCounts(esClient, '.kibana', []);
    // Make sure ES.search is triggered (we'll test the actual params in other specific tests)
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results).toStrictEqual({ total: 0, per_type: [] });
  });

  test('should apply the terms query and aggregation with the size matching the length of the list', async () => {
    const esClient = mockGetSavedObjectsCounts({});
    await getSavedObjectsCounts(esClient, '.kibana', ['type_one', 'type_two']);
    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana',
      ignore_unavailable: true,
      filter_path: ['aggregations.types.buckets', 'hits.total'],
      body: {
        size: 0,
        track_total_hits: true,
        query: { terms: { type: ['type_one', 'type_two'] } },
        aggs: {
          types: {
            terms: { field: 'type', size: 2 },
          },
        },
      },
    });
  });

  test('return the properties `key` and `doc_count` from the buckets', async () => {
    const buckets = [
      { key: 'type_one', doc_count: 1, max_score: { value: 1 } },
      { key: 'type-two', doc_count: 2 },
    ];

    const esClient = mockGetSavedObjectsCounts({
      hits: { total: { value: 13 } },
      aggregations: { types: { buckets } },
    });

    const results = await getSavedObjectsCounts(esClient, '.kibana', ['type_one', 'type-two']);
    expect(results).toStrictEqual({
      total: 13,
      per_type: [
        { key: 'type_one', doc_count: 1 },
        { key: 'type-two', doc_count: 2 },
      ],
    });
  });

  test('supports ES returning total as a number (just in case)', async () => {
    const buckets = [
      { key: 'type_one', doc_count: 1 },
      { key: 'type-two', doc_count: 2 },
    ];

    const esClient = mockGetSavedObjectsCounts({
      hits: { total: 13 },
      aggregations: { types: { buckets } },
    });

    const results = await getSavedObjectsCounts(esClient, '.kibana', ['type_one']);
    expect(results).toStrictEqual({
      total: 13,
      per_type: [
        { key: 'type_one', doc_count: 1 },
        { key: 'type-two', doc_count: 2 },
      ],
    });
  });
});
