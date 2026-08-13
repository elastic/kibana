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
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { bulkOverwriteTransformedDocuments } from './bulk_overwrite_transformed_documents';
import { DEFAULT_TIMEOUT } from './constants';

jest.mock('./catch_retryable_es_client_errors');

describe('bulkOverwriteTransformedDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes DEFAULT_TIMEOUT to client.bulk by default', async () => {
    const client = elasticsearchClientMock.createInternalClient(Promise.resolve({ items: [] }));

    await bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
    })();

    expect(client.bulk).toHaveBeenCalledWith(expect.objectContaining({ timeout: DEFAULT_TIMEOUT }));
  });

  it('allows overriding the timeout', async () => {
    const client = elasticsearchClientMock.createInternalClient(Promise.resolve({ items: [] }));

    await bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
      timeout: '1s',
    })();

    expect(client.bulk).toHaveBeenCalledWith(expect.objectContaining({ timeout: '1s' }));
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
      operations: [],
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
      operations: [],
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
      operations: [],
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
      operations: [],
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
      operations: [],
      refresh: 'wait_for',
    });

    await expect(task()).rejects.toThrow();
  });

  it('resolves with `left:unavailable_shards_exception` if all errors are unavailable_shards_exception', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'unavailable_shards_exception',
                reason:
                  '[.kibana_9.0.1_001][0] Not enough active copies to meet shard count of [ALL]',
              },
            },
          },
          {
            index: {
              error: {
                type: 'unavailable_shards_exception',
                reason:
                  '[.kibana_9.0.1_001][0] Not enough active copies to meet shard count of [ALL]',
              },
            },
          },
        ],
      })
    );

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
      refresh: 'wait_for',
    });

    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left.type).toEqual('unavailable_shards_exception');
    expect((result as Either.Left<any>).left.message).toContain('new_index');
  });

  it('includes allocation explain detail in the message when allocationExplain succeeds', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'unavailable_shards_exception',
                reason:
                  '[.kibana_9.0.1_001][0] Not enough active copies to meet shard count of [ALL]',
              },
            },
          },
        ],
      })
    );
    client.cluster.allocationExplain.mockResolvedValueOnce({
      index: 'new_index',
      shard: 0,
      primary: false,
      current_state: 'unassigned',
      allocate_explanation:
        'cannot allocate because allocation is not permitted to any of the nodes',
      node_allocation_decisions: [
        {
          node_id: 'abc',
          node_name: 'instance-0000000003',
          node_decision: 'no' as any,
          node_attributes: {},
          roles: [] as any,
          transport_address: '10.0.0.1:9300',
          deciders: [
            {
              decider: 'disk_threshold',
              decision: 'NO' as const,
              explanation:
                'the node is above the high watermark cluster setting [90%], free: 4gb [8.3%]',
            },
          ],
        },
      ],
    } as any);

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
      refresh: 'wait_for',
      fetchAllocationExplain: true,
    });

    const result = await task();

    expect(client.cluster.allocationExplain).toHaveBeenCalledWith(
      { index: 'new_index', shard: 0, primary: false, master_timeout: '30s' },
      { maxRetries: 0 }
    );
    expect(Either.isLeft(result)).toBe(true);
    const left = (result as Either.Left<any>).left;
    expect(left.type).toEqual('unavailable_shards_exception');
    expect(left.message).toContain('Shard allocation explain:');
    expect(left.message).toContain('disk_threshold');
    expect(left.message).toContain('90%');
  });

  it('retries allocation explain against the primary copy when the replica request is rejected', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'unavailable_shards_exception',
                reason:
                  '[.kibana_9.0.1_001][0] Not enough active copies to meet shard count of [ALL]',
              },
            },
          },
        ],
      })
    );
    // A red index (unassigned primary) rejects the replica-copy explain request with a 400.
    const unableToFindShardsError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 400,
        body: {
          error: {
            type: 'illegal_argument_exception',
            reason: 'unable to find any shards to explain [new_index][0] in the routing table',
          },
        },
      })
    );
    client.cluster.allocationExplain.mockRejectedValueOnce(unableToFindShardsError);
    client.cluster.allocationExplain.mockResolvedValueOnce({
      index: 'new_index',
      shard: 0,
      primary: true,
      current_state: 'unassigned',
      allocate_explanation:
        'cannot allocate because allocation is not permitted to any of the nodes',
      node_allocation_decisions: [
        {
          node_id: 'abc',
          node_name: 'instance-0000000003',
          node_decision: 'no' as any,
          node_attributes: {},
          roles: [] as any,
          transport_address: '10.0.0.1:9300',
          deciders: [
            {
              decider: 'enable',
              decision: 'NO' as const,
              explanation:
                'no allocations are allowed due to index setting [index.routing.allocation.enable=none]',
            },
          ],
        },
      ],
    } as any);

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
      refresh: 'wait_for',
      fetchAllocationExplain: true,
    });

    const result = await task();

    expect(client.cluster.allocationExplain).toHaveBeenCalledTimes(2);
    expect(client.cluster.allocationExplain).toHaveBeenNthCalledWith(
      1,
      { index: 'new_index', shard: 0, primary: false, master_timeout: '30s' },
      { maxRetries: 0 }
    );
    expect(client.cluster.allocationExplain).toHaveBeenNthCalledWith(
      2,
      { index: 'new_index', shard: 0, primary: true, master_timeout: '30s' },
      { maxRetries: 0 }
    );
    expect(Either.isLeft(result)).toBe(true);
    const left = (result as Either.Left<any>).left;
    expect(left.type).toEqual('unavailable_shards_exception');
    expect(left.message).toContain('Shard allocation explain:');
    expect(left.message).toContain('index.routing.allocation.enable=none');
  });

  it('falls back to base message when allocationExplain call fails', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'unavailable_shards_exception',
                reason:
                  '[.kibana_9.0.1_001][0] Not enough active copies to meet shard count of [ALL]',
              },
            },
          },
        ],
      })
    );
    client.cluster.allocationExplain.mockRejectedValueOnce(new Error('403 Forbidden'));

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
      refresh: 'wait_for',
      fetchAllocationExplain: true,
    });

    const result = await task();

    // Only 400s trigger the primary-copy retry; other failures give up after one request.
    expect(client.cluster.allocationExplain).toHaveBeenCalledTimes(1);
    expect(Either.isLeft(result)).toBe(true);
    const left = (result as Either.Left<any>).left;
    expect(left.type).toEqual('unavailable_shards_exception');
    expect(left.message).toContain('new_index');
    expect(left.message).not.toContain('Shard allocation explain:');
  });

  it('falls back to base message when both allocation explain requests fail', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'unavailable_shards_exception',
                reason:
                  '[.kibana_9.0.1_001][0] Not enough active copies to meet shard count of [ALL]',
              },
            },
          },
        ],
      })
    );
    const unableToFindShardsError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 400,
        body: {
          error: {
            type: 'illegal_argument_exception',
            reason: 'unable to find any shards to explain [new_index][0] in the routing table',
          },
        },
      })
    );
    client.cluster.allocationExplain.mockRejectedValueOnce(unableToFindShardsError);
    client.cluster.allocationExplain.mockRejectedValueOnce(new Error('socket hang up'));

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
      refresh: 'wait_for',
      fetchAllocationExplain: true,
    });

    const result = await task();

    expect(client.cluster.allocationExplain).toHaveBeenCalledTimes(2);
    expect(Either.isLeft(result)).toBe(true);
    const left = (result as Either.Left<any>).left;
    expect(left.type).toEqual('unavailable_shards_exception');
    expect(left.message).toContain('new_index');
    expect(left.message).not.toContain('Shard allocation explain:');
  });

  it('resolves with `left:unavailable_shards_exception` when mixed with version_conflict_engine_exception', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'version_conflict_engine_exception',
                reason: 'version conflict',
              },
            },
          },
          {
            index: {
              error: {
                type: 'unavailable_shards_exception',
                reason:
                  '[.kibana_9.0.1_001][0] Not enough active copies to meet shard count of [ALL]',
              },
            },
          },
        ],
      })
    );

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
      refresh: 'wait_for',
    });

    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left.type).toEqual('unavailable_shards_exception');
  });

  it('throws if errors are a mix of unavailable_shards_exception and other non-retryable errors', async () => {
    (catchRetryableEsClientErrors as jest.Mock).mockImplementation((e) => {
      throw e;
    });

    const client = elasticsearchClientMock.createInternalClient(
      Promise.resolve({
        items: [
          {
            index: {
              error: {
                type: 'unavailable_shards_exception',
                reason:
                  '[.kibana_9.0.1_001][0] Not enough active copies to meet shard count of [ALL]',
              },
            },
          },
          {
            index: {
              error: {
                type: 'mapper_parsing_exception',
                reason: 'failed to parse',
              },
            },
          },
        ],
      })
    );

    const task = bulkOverwriteTransformedDocuments({
      client,
      index: 'new_index',
      operations: [],
      refresh: 'wait_for',
    });

    await expect(task()).rejects.toThrow();
  });
});
