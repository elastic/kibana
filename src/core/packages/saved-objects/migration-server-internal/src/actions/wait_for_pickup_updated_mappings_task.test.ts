/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { waitForPickupUpdatedMappingsTask } from './wait_for_pickup_updated_mappings_task';

jest.mock('./catch_retryable_es_client_errors', () => {
  const { catchRetryableEsClientErrors: actualImplementation } = jest.requireActual(
    './catch_retryable_es_client_errors'
  );
  return {
    catchRetryableEsClientErrors: jest.fn(actualImplementation),
  };
});

describe('waitForPickupUpdatedMappingsTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const task = waitForPickupUpdatedMappingsTask({
      client,
      taskId: 'my task id',
      timeout: '60s',
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }

    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });
  it('re-throws non retry-able errors', async () => {
    const nonRetryableError = new Error('crash');
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(nonRetryableError)
    );

    const task = waitForPickupUpdatedMappingsTask({
      client,
      taskId: 'my task id',
      timeout: '2m',
    });
    expect(task()).rejects.toThrowError(nonRetryableError);
  });
});
