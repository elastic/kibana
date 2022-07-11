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

    const results = await getSavedObjectsCounts(esClient, '.kibana', ['type-a']);
    // Make sure ES.search is triggered (we'll test the actual params in other specific tests)
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results).toStrictEqual({ total: 0, per_type: [], non_expected_types: [], others: 0 });
  });

  test('should match all and request the `missing` bucket (size + 1) when `exclusive === false`', async () => {
    const esClient = mockGetSavedObjectsCounts({});
    await getSavedObjectsCounts(esClient, '.kibana', ['type-a', 'type_2']);
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
        query: { match_all: {} },
        aggs: {
          types: {
            terms: {
              field: 'type',
              size: 3,
              missing: 'missing_so_type',
            },
          },
        },
      },
    });
  });

  test('should apply the terms query and aggregation with the size matching the length of the list when `exclusive === true`', async () => {
    const esClient = mockGetSavedObjectsCounts({});
    await getSavedObjectsCounts(esClient, '.kibana', ['type_one', 'type_two'], true);
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
        query: { terms: { type: ['type_one', 'type_two'] } },
        aggs: { types: { terms: { field: 'type', size: 2 } } },
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

    const results = await getSavedObjectsCounts(esClient, '.kibana', [
      'type_one',
      'type-two',
      'type-3',
    ]);
    expect(results).toStrictEqual({
      total: 13,
      per_type: [
        { key: 'type_one', doc_count: 1 },
        { key: 'type-two', doc_count: 2 },
      ],
      non_expected_types: [],
      others: 10,
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

    const results = await getSavedObjectsCounts(esClient, '.kibana', ['type_one', 'type-two']);
    expect(results).toStrictEqual({
      total: 13,
      per_type: [
        { key: 'type_one', doc_count: 1 },
        { key: 'type-two', doc_count: 2 },
      ],
      non_expected_types: [],
      others: 10,
    });
  });

  test('list non_expected_types if they show up in the breakdown but they are not listed in the SO Types list', async () => {
    const buckets = [
      { key: 'type_one', doc_count: 1, max_score: { value: 1 } },
      { key: 'type-two', doc_count: 2 },
      { key: 'type-3', doc_count: 2 },
      { key: 'type-four', doc_count: 2 },
    ];

    const esClient = mockGetSavedObjectsCounts({
      hits: { total: { value: 13 } },
      aggregations: { types: { buckets, sum_other_doc_count: 6 } },
    });

    const results = await getSavedObjectsCounts(esClient, '.kibana', ['type_one', 'type-two']);
    expect(results).toStrictEqual({
      total: 13,
      per_type: [
        { key: 'type_one', doc_count: 1 },
        { key: 'type-two', doc_count: 2 },
        { key: 'type-3', doc_count: 2 },
        { key: 'type-four', doc_count: 2 },
      ],
      non_expected_types: ['type-3', 'type-four'],
      others: 6,
    });
  });
});
