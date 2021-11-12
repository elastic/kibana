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
import { searchForOutdatedDocuments } from './search_for_outdated_documents';

describe('searchForOutdatedDocuments', () => {
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
  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    const task = searchForOutdatedDocuments(client, {
      batchSize: 1000,
      targetIndex: 'new_index',
      outdatedDocumentsQuery: {},
    });

    try {
      await task();
    } catch (e) {
      /** ignore */
    }

    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });

  it('configures request according to given parameters', async () => {
    const esClient = elasticsearchClientMock.createInternalClient();
    const query = {};
    const targetIndex = 'new_index';
    const batchSize = 1000;
    const task = searchForOutdatedDocuments(esClient, {
      batchSize,
      targetIndex,
      outdatedDocumentsQuery: query,
    });

    await task();

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: targetIndex,
        size: batchSize,
        body: expect.objectContaining({ query }),
      })
    );
  });
});
