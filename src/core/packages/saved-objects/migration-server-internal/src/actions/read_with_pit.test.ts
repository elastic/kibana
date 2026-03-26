/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { readWithPit } from './read_with_pit';
import * as errorHandlers from './catch_retryable_es_client_errors';

describe('readWithPit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('calls esClient.search with the appropriate params', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({ hits: { hits: [] } })
    );

    await readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
      maxResponseSizeBytes: 100_000,
    })();

    expect(client.search).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledWith(
      {
        allow_partial_search_results: false,
        pit: {
          id: 'pitId',
          keep_alive: '10m',
        },
        query: {
          match_all: {},
        },
        search_after: undefined,
        seq_no_primary_term: undefined,
        size: 10000,
        sort: '_shard_doc:asc',
        track_total_hits: true,
      },
      { maxResponseSize: 100_000 }
    );
  });

  it('returns a refreshed pit id when ES returns pit_id', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({ pit_id: 'refreshed_pit_id', hits: { hits: [] } })
    );

    const result = await readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
    })();

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.pitId).toBe('refreshed_pit_id');
    }
  });

  it('keeps the previous pit id when ES does not return pit_id', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({ hits: { hits: [] } })
    );

    const result = await readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
    })();

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.pitId).toBe('pitId');
    }
  });

  it('returns left es_response_too_large when client throws RequestAbortedError', async () => {
    // Create a mock client that rejects all methods with a RequestAbortedError
    // response.
    const retryableError = new EsErrors.RequestAbortedError(
      'The content length (536870889) is bigger than the maximum allow string (536870888)'
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(retryableError)
    );

    const task = readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    await expect(task()).resolves.toEqual({
      _tag: 'Left',
      left: { contentLength: 536870889, type: 'es_response_too_large' },
    });
  });

  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    // Create a mock client that rejects all methods with a 503 status code
    // response.
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 503,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      })
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(retryableError)
    );

    const catchClientErrorsSpy = jest.spyOn(errorHandlers, 'catchRetryableEsClientErrors');
    const catchSearchPhaseExceptionSpy = jest.spyOn(
      errorHandlers,
      'catchRetryableSearchPhaseExecutionException'
    );

    const task = readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
    });
    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual(
      expect.objectContaining({
        type: 'retryable_es_client_error',
      })
    );
    expect(catchSearchPhaseExceptionSpy).toHaveBeenCalledWith(retryableError);
    expect(catchClientErrorsSpy).toHaveBeenCalledWith(retryableError);
  });

  it('calls catchRetryableSearchPhaseExecutionException when the promise rejects', async () => {
    // Create a mock client that rejects all methods with a search_phase_execution_exception
    // response.
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        body: {
          error: {
            type: 'search_phase_execution_exception',
            caused_by: {
              type: 'search_phase_execution_exception',
              reason:
                'Search rejected due to missing shards [.kibana]. Consider using `allow_partial_search_results` setting to bypass this error.',
            },
          },
        },
      })
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(retryableError)
    );

    const catchClientErrorsSpy = jest.spyOn(errorHandlers, 'catchRetryableEsClientErrors');
    const catchSearchPhaseExceptionSpy = jest.spyOn(
      errorHandlers,
      'catchRetryableSearchPhaseExecutionException'
    );

    const task = readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
    });
    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual(
      expect.objectContaining({
        type: 'retryable_es_client_error',
      })
    );
    expect(catchSearchPhaseExceptionSpy).toHaveBeenCalledWith(retryableError);
    // the second handler shouldn't be called since the first one is not throwing
    expect(catchClientErrorsSpy).not.toHaveBeenCalled();
  });

  it('throws if neither handler can retry', async () => {
    // Create a mock client that rejects all methods with a 500 status code
    // response.
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 500,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      })
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(retryableError)
    );

    const catchClientErrorsSpy = jest.spyOn(errorHandlers, 'catchRetryableEsClientErrors');
    const catchSearchPhaseExceptionSpy = jest.spyOn(
      errorHandlers,
      'catchRetryableSearchPhaseExecutionException'
    );

    const task = readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
    });

    // Should throw because both handlers can't retry 500 responses
    await expect(task()).rejects.toThrow();
    expect(catchSearchPhaseExceptionSpy).toHaveBeenCalledWith(retryableError);
    expect(catchClientErrorsSpy).toHaveBeenCalledWith(retryableError);
  });
});
