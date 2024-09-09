/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { checkForUnknownDocs } from './check_for_unknown_docs';
import { createAggregateTypesSearchResponse } from './check_for_unknown_docs.mocks';

jest.mock('./catch_retryable_es_client_errors');

describe('checkForUnknownDocs', () => {
  const excludeOnUpgradeQuery: QueryDslQueryContainer = {
    bool: { must: [{ term: { hello: 'dolly' } }] },
  };
  const knownTypes = ['foo', 'bar'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    // Create a mock client that rejects all methods with a 503 status code response.
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 503,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      })
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(retryableError)
    );

    const task = checkForUnknownDocs({
      client,
      indexName: '.kibana_8.0.0',
      knownTypes,
      excludeOnUpgradeQuery,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });

  it('calls `client.search` with the correct parameters', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({ hits: { hits: [] } })
    );

    const task = checkForUnknownDocs({
      client,
      indexName: '.kibana_8.0.0',
      knownTypes,
      excludeOnUpgradeQuery,
    });

    await task();

    expect(client.search).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledWith({
      index: '.kibana_8.0.0',
      size: 0,
      aggs: {
        typesAggregation: {
          terms: {
            // assign type __UNKNOWN__ to those documents that don't define one
            missing: '__UNKNOWN__',
            field: 'type',
            size: 1000, // collect up to 1000 non-registered types
          },
          aggs: {
            docs: {
              top_hits: {
                size: 100, // collect up to 100 docs for each non-registered type
                _source: {
                  excludes: ['*'],
                },
              },
            },
          },
        },
      },
      query: {
        bool: {
          ...excludeOnUpgradeQuery.bool,
          must_not: knownTypes.map((type) => ({
            term: {
              type,
            },
          })),
        },
      },
    });
  });

  it('resolves with `Either.right` when no unknown docs are found', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({ hits: { hits: [] } })
    );

    const task = checkForUnknownDocs({
      client,
      indexName: '.kibana_8.0.0',
      knownTypes,
      excludeOnUpgradeQuery,
    });

    const result = await task();

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual({});
  });

  describe('when unknown doc types are found', () => {
    it('resolves with `Either.right`, returning the unknown doc types', async () => {
      const client = elasticsearchClientMock.createInternalClient(
        Promise.resolve(
          createAggregateTypesSearchResponse({
            foo: ['12'],
            bar: ['14'],
            __UNKNOWN__: ['16'],
          })
        )
      );

      const task = checkForUnknownDocs({
        client,
        indexName: '.kibana_8.0.0',
        knownTypes,
        excludeOnUpgradeQuery,
      });

      const result = await task();

      expect(Either.isRight(result)).toBe(true);
      expect((result as Either.Right<any>).right).toEqual({
        type: 'unknown_docs_found',
        unknownDocs: [
          { id: '12', type: 'foo' },
          { id: '14', type: 'bar' },
          { id: '16', type: '__UNKNOWN__' },
        ],
      });
    });
  });
});
