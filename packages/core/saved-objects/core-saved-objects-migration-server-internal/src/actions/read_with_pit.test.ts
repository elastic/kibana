/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { readWithPit } from './read_with_pit';

jest.mock('./catch_retryable_es_client_errors');

describe('readWithPit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('calls esClient.search with the appropriate params', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          total: 0,
          hits: [],
        },
      })
    );

    await readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
    })();

    expect(client.search).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledWith({
      allow_partial_search_results: false,
      pit: {
        id: 'pitId',
        keep_alive: '10m',
      },
      query: {
        match_all: {},
      },
      search_after: undefined,
      seq_no_primary_term: undefined,
      size: 10000,
      sort: '_shard_doc:asc',
      track_total_hits: true,
    });
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

    const task = readWithPit({
      client,
      pitId: 'pitId',
      query: { match_all: {} },
      batchSize: 10_000,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });
});
