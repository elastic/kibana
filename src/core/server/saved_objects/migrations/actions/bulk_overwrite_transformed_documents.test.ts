/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/Either';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { bulkOverwriteTransformedDocuments } from './bulk_overwrite_transformed_documents';

jest.mock('./catch_retryable_es_client_errors');

describe('bulkOverwriteTransformedDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves with `right:bulk_index_succeeded` if no error is encountered', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              _index: '.dolly',
            },
          },
          {
            index: {
              _index: '.dolly',
            },
          },
        ],
      })
    );

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      transformedDocs: [],
      refresh: 'wait_for',
    });

    const result = await task();

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual('bulk_index_succeeded');
  });

  it('resolves with `right:bulk_index_succeeded` if version conflict errors are encountered', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              _index: '.dolly',
            },
          },
          {
            index: {
              error: {
                type: 'version_conflict_engine_exception',
                reason: 'reason',
              },
            },
          },
        ],
      })
    );

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      transformedDocs: [],
      refresh: 'wait_for',
    });

    const result = await task();

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual('bulk_index_succeeded');
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

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      transformedDocs: [],
      refresh: 'wait_for',
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }

    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });

  it('resolves with `left:target_index_had_write_block` if all errors are write block exceptions', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'cluster_block_exception',
                reason:
                  'index [.kibana_9000] blocked by: [FORBIDDEN/8/moving to block index write (api)]',
              },
            },
          },
          {
            index: {
              error: {
                type: 'cluster_block_exception',
                reason:
                  'index [.kibana_9000] blocked by: [FORBIDDEN/8/moving to block index write (api)]',
              },
            },
          },
        ],
      })
    );

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      transformedDocs: [],
      refresh: 'wait_for',
    });

    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual({
      type: 'target_index_had_write_block',
    });
  });

  it('throws an error if any error is not a write block exceptions', async () => {
    (catchRetryableEsClientErrors as jest.Mock).mockImplementation((e) => {
      throw e;
    });

    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'cluster_block_exception',
                reason:
                  'index [.kibana_9000] blocked by: [FORBIDDEN/8/moving to block index write (api)]',
              },
            },
          },
          {
            index: {
              error: {
                type: 'dolly_exception',
                reason: 'because',
              },
            },
          },
          {
            index: {
              error: {
                type: 'cluster_block_exception',
                reason:
                  'index [.kibana_9000] blocked by: [FORBIDDEN/8/moving to block index write (api)]',
              },
            },
          },
        ],
      })
    );

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      transformedDocs: [],
      refresh: 'wait_for',
    });

    await expect(task()).rejects.toThrow();
  });
});
