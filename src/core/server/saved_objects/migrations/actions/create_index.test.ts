/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
jest.mock('./catch_retryable_es_client_errors');
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { createIndex } from './create_index';
import { setWriteBlock } from './set_write_block';

describe('createIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  const nonRetryableError = new Error('crash');
  const clientWithNonRetryableError = elasticsearchClientMock.createInternalClient(
    elasticsearchClientMock.createErrorTransportRequestPromise(nonRetryableError)
  );
  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    const task = createIndex({
      client,
      indexName: 'new_index',
      mappings: { properties: {} },
      migrationDocLinks: { resolveMigrationFailures: 'resolveMigrationFailures' },
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }

    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });
  it('re-throws non retry-able errors', async () => {
    const task = setWriteBlock({
      client: clientWithNonRetryableError,
      index: 'my_index',
    });
    await task();
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(nonRetryableError);
  });
});
