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
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { createIndex } from './create_index';

jest.mock('./catch_retryable_es_client_errors');

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

  it('calls client.indices.create with the correct parameter for default ES', async () => {
    const statefulCapabilities = elasticsearchServiceMock.createCapabilities({ serverless: false });
    const task = createIndex({
      client,
      indexName: 'my_index',
      mappings: { properties: {} },
      esCapabilities: statefulCapabilities,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(client.indices.create.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "aliases": Object {},
        "index": "my_index",
        "mappings": Object {
          "properties": Object {},
        },
        "settings": Object {
          "index": Object {
            "auto_expand_replicas": "0-1",
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
        "timeout": "300s",
      }
    `);
  });

  it('calls client.indices.create with the correct parameter for serverless ES', async () => {
    const statelessCapabilities = elasticsearchServiceMock.createCapabilities({ serverless: true });
    const task = createIndex({
      client,
      indexName: 'my_index',
      mappings: { properties: {} },
      esCapabilities: statelessCapabilities,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(client.indices.create.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "aliases": Object {},
        "index": "my_index",
        "mappings": Object {
          "properties": Object {},
        },
        "settings": Object {
          "index": Object {
            "mapping": Object {
              "total_fields": Object {
                "limit": 1500,
              },
            },
          },
        },
        "timeout": "300s",
      }
    `);
  });

  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    const task = createIndex({
      client,
      indexName: 'new_index',
      mappings: { properties: {} },
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
    const task = createIndex({
      client: clientWithNonRetryableError,
      indexName: 'my_index',
      mappings: { properties: {} },
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
