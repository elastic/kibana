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
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { deleteByQuery } from './delete_by_query';

jest.mock('./catch_retryable_es_client_errors');

describe('deleteByQuery', () => {
  const deleteQuery = {
    bool: {
      should: ['server', 'deprecated'].map((type) => ({
        term: {
          type,
        },
      })),
    },
  };

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

    const task = deleteByQuery({
      client,
      indexName: '.kibana_8.0.0',
      query: deleteQuery,
      conflicts: 'proceed',
      refresh: true,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });

  it('calls `client.deleteByQuery` with the correct parameters', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({ hits: { hits: [] } })
    );

    const task = deleteByQuery({
      client,
      indexName: '.kibana_8.0.0',
      query: deleteQuery,
      conflicts: 'proceed',
      refresh: true,
    });

    await task();

    expect(client.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(client.deleteByQuery).toHaveBeenCalledWith({
      index: '.kibana_8.0.0',
      query: deleteQuery,
      refresh: true,
      wait_for_completion: false,
      conflicts: 'proceed',
    });
  });

  it('resolves with `Either.right` if the delete task is successfully created', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        took: 147,
        timed_out: false,
        task: 1234,
      })
    );

    const task = deleteByQuery({
      client,
      indexName: '.kibana_8.0.0',
      query: deleteQuery,
      conflicts: 'proceed',
      refresh: true,
    });

    const result = await task();

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual({ taskId: '1234' });
  });
});
