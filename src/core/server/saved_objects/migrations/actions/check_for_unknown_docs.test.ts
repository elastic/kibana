/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { checkForUnknownDocs } from './check_for_unknown_docs';

jest.mock('./catch_retryable_es_client_errors');

describe('checkForUnknownDocs', () => {
  const unusedTypesQuery: estypes.QueryDslQueryContainer = {
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
      unusedTypesQuery,
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
      unusedTypesQuery,
    });

    await task();

    expect(client.search).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledWith({
      index: '.kibana_8.0.0',
      body: {
        query: {
          bool: {
            must: unusedTypesQuery,
            must_not: knownTypes.map((type) => ({
              term: {
                type,
              },
            })),
          },
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
      unusedTypesQuery,
    });

    const result = await task();

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual({});
  });

  it('resolves with `Either.left` when unknown docs are found', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        hits: {
          hits: [
            { _id: '12', _source: { type: 'foo' } },
            { _id: '14', _source: { type: 'bar' } },
          ],
        },
      })
    );

    const task = checkForUnknownDocs({
      client,
      indexName: '.kibana_8.0.0',
      knownTypes,
      unusedTypesQuery,
    });

    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual({
      type: 'unknown_docs_found',
      unknownDocs: [
        { id: '12', type: 'foo' },
        { id: '14', type: 'bar' },
      ],
    });
  });

  it('uses `unknown` as the type when the document does not contain a type field', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        hits: {
          hits: [{ _id: '12', _source: {} }],
        },
      })
    );

    const task = checkForUnknownDocs({
      client,
      indexName: '.kibana_8.0.0',
      knownTypes,
      unusedTypesQuery,
    });

    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual({
      type: 'unknown_docs_found',
      unknownDocs: [{ id: '12', type: 'unknown' }],
    });
  });
});
