/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Option from 'fp-ts/lib/Option';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { reindex } from './reindex';

jest.mock('./catch_retryable_es_client_errors');

describe('reindex', () => {
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
    const task = reindex({
      client,
      sourceIndex: 'my_source_index',
      targetIndex: 'my_target_index',
      reindexScript: Option.none,
      requireAlias: false,
      excludeOnUpgradeQuery: {},
      batchSize: 1000,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });

  it('passes options to Elasticsearch client', async () => {
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          total: 0,
          hits: [],
        },
      })
    );
    const task = reindex({
      client,
      sourceIndex: 'my_source_index',
      targetIndex: 'my_target_index',
      reindexScript: Option.some('my script'),
      requireAlias: false,
      excludeOnUpgradeQuery: { match_all: {} },
      batchSize: 99,
    });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(client.reindex).toHaveBeenCalledTimes(1);
    expect(client.reindex).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          conflicts: 'proceed',
          source: {
            index: 'my_source_index',
            size: 99,
            query: { match_all: {} },
          },
          dest: {
            index: 'my_target_index',
            op_type: 'create',
          },
          script: { lang: 'painless', source: 'my script' },
        },
      })
    );
  });
});
