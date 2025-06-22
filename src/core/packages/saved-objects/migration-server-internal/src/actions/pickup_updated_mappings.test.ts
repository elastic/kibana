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
import * as errorHandlers from './catch_retryable_es_client_errors';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { pickupUpdatedMappings } from './pickup_updated_mappings';

describe('pickupUpdatedMappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls both handlers when the promise rejection cannot be retried by either', async () => {
    // Create a mock client that rejects all methods with a 502 status code
    // response
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 502,
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

    const task = pickupUpdatedMappings(client, 'my_index', 1000);
    // Should throw because both handlers can't retry 502 responses
    await expect(task()).rejects.toThrow();
    expect(catchSearchPhaseExceptionSpy).toHaveBeenCalledWith(retryableError);
    expect(catchClientErrorsSpy).toHaveBeenCalledWith(retryableError);
  });
  it('calls both handlers when the promise rejection cannot be handled by catchRetryableSearchPhaseExecutionException', async () => {
    // Create a mock client that rejects all methods with a 503 status code
    // response
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

    const task = pickupUpdatedMappings(client, 'my_index', 1000);
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
  it('calls only the first handler when the promise rejection can be handled by it', async () => {
    // Create a mock client that rejects all methods with search_phase_execution_exception
    // response
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 503,
        body: { error: { type: 'search_phase_execution_exception' } },
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

    const task = pickupUpdatedMappings(client, 'my_index', 1000);
    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual(
      expect.objectContaining({
        type: 'retryable_es_client_error',
      })
    );
    expect(catchSearchPhaseExceptionSpy).toHaveBeenCalledWith(retryableError);
    // the second handler shouldn't be called since the first one is not throwing
    expect(catchClientErrorsSpy).not.toBeCalled();
  });
});
