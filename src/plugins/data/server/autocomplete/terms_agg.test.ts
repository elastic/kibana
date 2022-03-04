/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '../../../../core/server/mocks';
import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { ConfigSchema } from '../../config';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { termsAggSuggestions } from './terms_agg';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { duration } from 'moment';

let savedObjectsClientMock: jest.Mocked<SavedObjectsClientContract>;
let esClientMock: DeeplyMockedKeys<ElasticsearchClient>;
const configMock = {
  autocomplete: {
    valueSuggestions: { timeout: duration(4513), terminateAfter: duration(98430) },
  },
} as unknown as ConfigSchema;

// @ts-expect-error not full interface
const mockResponse = {
  aggregations: {
    suggestions: {
      buckets: [{ key: 'whoa' }, { key: 'amazing' }],
    },
  },
} as estypes.SearchResponse<any>;

jest.mock('../data_views');

describe('terms agg suggestions', () => {
  beforeEach(() => {
    const requestHandlerContext = coreMock.createRequestHandlerContext();
    savedObjectsClientMock = requestHandlerContext.savedObjects.client;
    esClientMock = requestHandlerContext.elasticsearch.client.asCurrentUser;
    esClientMock.search.mockResolvedValue(mockResponse);
  });

  it('calls the _search API with a terms agg with the given args', async () => {
    const result = await termsAggSuggestions(
      configMock,
      savedObjectsClientMock,
      esClientMock,
      'index',
      'fieldName',
      'query',
      [],
      { name: 'field_name', type: 'string' }
    );

    const [[args]] = esClientMock.search.mock.calls;

    expect(args).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "suggestions": Object {
              "terms": Object {
                "execution_hint": "map",
                "field": "field_name",
                "include": "query.*",
                "shard_size": 10,
              },
            },
          },
          "query": Object {
            "bool": Object {
              "filter": Array [],
            },
          },
          "size": 0,
          "terminate_after": 98430,
          "timeout": "4513ms",
        },
        "index": "index",
      }
    `);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "whoa",
        "amazing",
      ]
    `);
  });

  it('calls the _search API with a terms agg and fallback to fieldName when field is null', async () => {
    const result = await termsAggSuggestions(
      configMock,
      savedObjectsClientMock,
      esClientMock,
      'index',
      'fieldName',
      'query',
      []
    );

    const [[args]] = esClientMock.search.mock.calls;

    expect(args).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "suggestions": Object {
              "terms": Object {
                "execution_hint": "map",
                "field": "fieldName",
                "include": "query.*",
                "shard_size": 10,
              },
            },
          },
          "query": Object {
            "bool": Object {
              "filter": Array [],
            },
          },
          "size": 0,
          "terminate_after": 98430,
          "timeout": "4513ms",
        },
        "index": "index",
      }
    `);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "whoa",
        "amazing",
      ]
    `);
  });
});
