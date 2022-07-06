/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { BUILT_IN_SO_TYPES, getSavedObjectsCounts } from './get_saved_object_counts';

function mockGetSavedObjectsCounts<TBody>(params: TBody) {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error arbitrary type
  esClient.search.mockResponse(params);
  return esClient;
}

describe('getSavedObjectsCounts', () => {
  test('should not fail if no body returned', async () => {
    const esClient = mockGetSavedObjectsCounts({});

    const results = await getSavedObjectsCounts(esClient, '.kibana');
    // Make sure ES.search is triggered (we'll test the actual params in other specific tests)
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results).toStrictEqual({ total: 0, per_type: [], others: 0 });
  });

  test('should match all when no types specified', async () => {
    const esClient = mockGetSavedObjectsCounts({});
    await getSavedObjectsCounts(esClient, '.kibana');
    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana',
      ignore_unavailable: true,
      filter_path: [
        'aggregations.types.buckets',
        'aggregations.types.sum_other_doc_count',
        'hits.total',
      ],
      body: {
        size: 0,
        track_total_hits: true,
        query: {
          bool: { must: [{ match_all: {} }], should: [{ terms: { type: BUILT_IN_SO_TYPES } }] },
        },
        aggs: {
          types: {
            terms: { field: 'type', size: BUILT_IN_SO_TYPES.length, order: { max_score: 'desc' } },
            aggs: { max_score: { max: { script: '_score' } } },
          },
        },
      },
    });
  });

  test('should terms query when types are specified', async () => {
    const esClient = mockGetSavedObjectsCounts({});
    await getSavedObjectsCounts(esClient, '.kibana', ['type_one', 'type_two']);
    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana',
      ignore_unavailable: true,
      filter_path: [
        'aggregations.types.buckets',
        'aggregations.types.sum_other_doc_count',
        'hits.total',
      ],
      body: {
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            must: [{ terms: { type: ['type_one', 'type_two'] } }],
            should: [{ terms: { type: ['type_one', 'type_two'] } }],
          },
        },
        aggs: {
          types: {
            terms: { field: 'type', size: 2, order: { max_score: 'desc' } },
            aggs: { max_score: { max: { script: '_score' } } },
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
      aggregations: { types: { buckets, sum_other_doc_count: 10 } },
    });

    const results = await getSavedObjectsCounts(esClient, '.kibana', ['type_one', 'type-two']);
    expect(results).toStrictEqual({
      total: 13,
      others: 10,
      per_type: [
        { key: 'type_one', doc_count: 1 },
        { key: 'type-two', doc_count: 2 },
      ],
    });
  });

  test('filters out the types we are not interested in, and adds their count to the others bucket', async () => {
    const buckets = [
      { key: 'type_one', doc_count: 1, max_score: { value: 1 } },
      { key: 'type-two', doc_count: 2 },
    ];

    const esClient = mockGetSavedObjectsCounts({
      hits: { total: { value: 13 } },
      aggregations: { types: { buckets, sum_other_doc_count: 10 } },
    });

    const results = await getSavedObjectsCounts(esClient, '.kibana');
    expect(results).toStrictEqual({
      total: 13,
      others: 13,
      per_type: [],
    });
  });

  test('supports ES returning total as a number (just in case)', async () => {
    const buckets = [
      { key: 'type_one', doc_count: 1 },
      { key: 'type-two', doc_count: 2 },
    ];

    const esClient = mockGetSavedObjectsCounts({
      hits: { total: 13 },
      aggregations: { types: { buckets, sum_other_doc_count: 10 } },
    });

    const results = await getSavedObjectsCounts(esClient, '.kibana', ['type_one']);
    expect(results).toStrictEqual({
      total: 13,
      others: 12,
      per_type: [{ key: 'type_one', doc_count: 1 }],
    });
  });
});
