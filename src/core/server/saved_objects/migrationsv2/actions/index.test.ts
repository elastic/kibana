/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Actions from './';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
jest.mock('./catch_retryable_es_client_errors');
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import * as Option from 'fp-ts/lib/Option';

describe('actions', () => {
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

  describe('fetchIndices', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.fetchIndices({ client, indices: ['my_index'] });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('setWriteBlock', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.setWriteBlock({ client, index: 'my_index' });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
    it('re-throws non retry-able errors', async () => {
      const task = Actions.setWriteBlock({
        client: clientWithNonRetryableError,
        index: 'my_index',
      });
      await task();
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(nonRetryableError);
    });
  });

  describe('cloneIndex', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.cloneIndex({
        client,
        source: 'my_source_index',
        target: 'my_target_index',
      });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
    it('re-throws non retry-able errors', async () => {
      const task = Actions.setWriteBlock({
        client: clientWithNonRetryableError,
        index: 'my_index',
      });
      await task();
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(nonRetryableError);
    });
  });

  describe('pickupUpdatedMappings', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.pickupUpdatedMappings(client, 'my_index');
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('openPit', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.openPit({ client, index: 'my_index' });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('readWithPit', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.readWithPit({
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

  describe('closePit', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.closePit({ client, pitId: 'pitId' });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('reindex', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.reindex({
        client,
        sourceIndex: 'my_source_index',
        targetIndex: 'my_target_index',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: {},
      });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('waitForReindexTask', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.waitForReindexTask({ client, taskId: 'my task id', timeout: '60s' });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
    it('re-throws non retry-able errors', async () => {
      const task = Actions.setWriteBlock({
        client: clientWithNonRetryableError,
        index: 'my_index',
      });
      await task();
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(nonRetryableError);
    });
  });

  describe('waitForPickupUpdatedMappingsTask', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.waitForPickupUpdatedMappingsTask({
        client,
        taskId: 'my task id',
        timeout: '60s',
      });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
    it('re-throws non retry-able errors', async () => {
      const task = Actions.setWriteBlock({
        client: clientWithNonRetryableError,
        index: 'my_index',
      });
      await task();
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(nonRetryableError);
    });
  });

  describe('updateAliases', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.updateAliases({ client, aliasActions: [] });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
    it('re-throws non retry-able errors', async () => {
      const task = Actions.setWriteBlock({
        client: clientWithNonRetryableError,
        index: 'my_index',
      });
      await task();
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(nonRetryableError);
    });
  });

  describe('createIndex', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.createIndex({
        client,
        indexName: 'new_index',
        mappings: { properties: {} },
      });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
    it('re-throws non retry-able errors', async () => {
      const task = Actions.setWriteBlock({
        client: clientWithNonRetryableError,
        index: 'my_index',
      });
      await task();
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(nonRetryableError);
    });
  });

  describe('updateAndPickupMappings', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.updateAndPickupMappings({
        client,
        index: 'new_index',
        mappings: { properties: {} },
      });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('searchForOutdatedDocuments', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.searchForOutdatedDocuments(client, {
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
      const task = Actions.searchForOutdatedDocuments(esClient, {
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

  describe('bulkOverwriteTransformedDocuments', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.bulkOverwriteTransformedDocuments({
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
  });

  describe('refreshIndex', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.refreshIndex({ client, targetIndex: 'target_index' });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });
});
