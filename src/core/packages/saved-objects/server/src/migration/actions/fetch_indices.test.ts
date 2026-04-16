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
import { fetchIndices } from './fetch_indices';

// Create a mock powered by the actual implementation
jest.mock('./catch_retryable_es_client_errors', () => ({
  catchRetryableEsClientErrors: jest
    .fn()
    .mockImplementation(
      jest.requireActual('./catch_retryable_es_client_errors').catchRetryableEsClientErrors
    ),
}));

describe('fetchIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 503,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      })
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(retryableError)
    );

    const task = fetchIndices({ client, indices: ['my_index'] });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });

  it('throws when cloud returns an incorrect 404 response', async () => {
    const notFoundError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 404,
        body: { ok: false, message: 'Unknown resource.' },
      })
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(notFoundError)
    );
    const task = fetchIndices({ client, indices: ['my_index'] });

    expect(task()).rejects.toMatchInlineSnapshot(
      `[ResponseError: {"ok":false,"message":"Unknown resource."}]`
    );
  });
});
