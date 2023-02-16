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
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { deleteByQuery } from './delete_by_query';
import { createDeleteByQueryResponse } from './delete_by_query.mocks';

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
    });

    await task();

    expect(client.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(client.deleteByQuery).toHaveBeenCalledWith({
      index: '.kibana_8.0.0',
      query: deleteQuery,
      refresh: true,
      wait_for_completion: true,
      conflicts: 'proceed',
    });
  });

  it('resolves with `Either.right` if the delete is successful', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve(createDeleteByQueryResponse())
    );

    const task = deleteByQuery({
      client,
      indexName: '.kibana_8.0.0',
      query: deleteQuery,
    });

    const result = await task();

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual('delete_successful' as const);
  });

  it('resolves with `Either.left`, if the delete query fails', async () => {
    const versionConflicts = [
      {
        index: '.kibana_8.0.0',
        id: 'dashboard:12345',
        status: 409,
        type: 'version_conflict_engine_exception',
        cause: {
          type: 'version_conflict_engine_exception',
          reason:
            '[dashboard:12345]: version conflict, required seqNo [609], primary term [1]. current document has seqNo [610] and primary term [1]',
          index_uuid: 'b8kXIJI4TnGpcPO3ThlFWg',
          shard: '0',
          index: '.kibana_8.0.0',
        },
      },
      {
        index: '.kibana_8.0.0',
        id: 'dashboard:678900',
        status: 409,
        type: 'version_conflict_engine_exception',
        cause: {
          type: 'version_conflict_engine_exception',
          reason:
            '[dashboard:678900]: version conflict, required seqNo [609], primary term [1]. current document has seqNo [610] and primary term [1]',
          index_uuid: 'b8kXIJI4TnGpcPO3ThlFWg',
          shard: '0',
          index: '.kibana_8.0.0',
        },
      },
    ];

    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve(createDeleteByQueryResponse(versionConflicts))
    );

    const task = deleteByQuery({
      client,
      indexName: '.kibana_8.0.0',
      query: deleteQuery,
    });

    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual({
      type: 'delete_failed',
      conflictingDocuments: versionConflicts,
    });
  });
});
