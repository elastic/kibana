/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { cloneIndex } from './clone_index';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';

jest.mock('./catch_retryable_es_client_errors');

describe('cloneIndex', () => {
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

  it('calls client.indices.clone with the correct parameter for default ES', async () => {
    const statefulCapabilities = elasticsearchServiceMock.createCapabilities({ serverless: false });
    const task = cloneIndex({
      client,
      source: 'my_source_index',
      target: 'my_target_index',
      esCapabilities: statefulCapabilities,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(client.indices.clone.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "index": "my_source_index",
        "settings": Object {
          "index": Object {
            "auto_expand_replicas": "0-1",
            "blocks.write": false,
            "mapping": Object {
              "total_fields": Object {
                "limit": 1500,
              },
            },
            "number_of_shards": 1,
            "priority": 10,
            "refresh_interval": "1s",
          },
        },
        "target": "my_target_index",
        "timeout": "300s",
        "wait_for_active_shards": "all",
      }
    `);
  });

  it('resolve left with operation_not_supported for serverless ES', async () => {
    const statelessCapabilities = elasticsearchServiceMock.createCapabilities({ serverless: true });
    const task = cloneIndex({
      client,
      source: 'my_source_index',
      target: 'my_target_index',
      esCapabilities: statelessCapabilities,
    });
    const result = await task();
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_tag": "Left",
        "left": Object {
          "operationName": "clone",
          "type": "operation_not_supported",
        },
      }
    `);
  });

  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    const task = cloneIndex({
      client,
      source: 'my_source_index',
      target: 'my_target_index',
      esCapabilities: elasticsearchServiceMock.createCapabilities(),
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });

  it('re-throws non retry-able errors', async () => {
    const task = cloneIndex({
      client: clientWithNonRetryableError,
      source: 'my_source_index',
      target: 'my_target_index',
      esCapabilities: elasticsearchServiceMock.createCapabilities(),
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(nonRetryableError);
  });
});
