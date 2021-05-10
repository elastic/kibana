/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchServiceMock } from '../../../../../../src/core/server/mocks';
import { getSavedObjectsCounts } from './get_saved_object_counts';

function mockGetSavedObjectsCounts<TBody>(params: TBody) {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  esClient.search.mockResolvedValue(
    // @ts-expect-error we only care about the response body
    { body: { ...params } }
  );
  return esClient;
}

describe('getSavedObjectsCounts', () => {
  test('should not fail if no body returned', async () => {
    const esClient = mockGetSavedObjectsCounts({});

    const results = await getSavedObjectsCounts(esClient, '.kibana');
    expect(results).toStrictEqual([]);
    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana',
      ignoreUnavailable: true,
      filterPath: 'aggregations.types.buckets',
      body: {
        size: 0,
        query: { match_all: {} },
        aggs: { types: { terms: { field: 'type' } } },
      },
    });
  });

  test('should match all when no types specified', async () => {
    const esClient = mockGetSavedObjectsCounts({});
    await getSavedObjectsCounts(esClient, '.kibana');
    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana',
      ignoreUnavailable: true,
      filterPath: 'aggregations.types.buckets',
      body: {
        size: 0,
        query: { match_all: {} },
        aggs: { types: { terms: { field: 'type' } } },
      },
    });
  });

  test('should terms query when types are specified', async () => {
    const esClient = mockGetSavedObjectsCounts({});
    await getSavedObjectsCounts(esClient, '.kibana', ['type_one', 'type_two']);
    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana',
      ignoreUnavailable: true,
      filterPath: 'aggregations.types.buckets',
      body: {
        size: 0,
        query: { terms: { type: ['type_one', 'type_two'] } },
        aggs: { types: { terms: { field: 'type' } } },
      },
    });
  });

  test('return the buckets as they are', async () => {
    const buckets = [
      { key: 'type_one', doc_count: 1 },
      { key: 'type-two', doc_count: 2 },
    ];

    const esClient = mockGetSavedObjectsCounts({ aggregations: { types: { buckets } } });

    const results = await getSavedObjectsCounts(esClient, '.kibana');
    expect(results).toStrictEqual(buckets);
  });
});
