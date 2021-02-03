/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

  // Create a mock client that rejects all methods with a 503 statuscode
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

  describe('fetchIndices', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.fetchIndices(client, ['my_index']);
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
      const task = Actions.setWriteBlock(client, 'my_index');
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('cloneIndex', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.cloneIndex(client, 'my_source_index', 'my_target_index');
      try {
        await task();
      } catch (e) {
        /** ignore */
      }
      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
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

  describe('reindex', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.reindex(
        client,
        'my_source_index',
        'my_target_index',
        Option.none,
        false
      );
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
      const task = Actions.waitForReindexTask(client, 'my task id', '60s');
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('waitForPickupUpdatedMappingsTask', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.waitForPickupUpdatedMappingsTask(client, 'my task id', '60s');
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('updateAliases', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.updateAliases(client, []);
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('createIndex', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.createIndex(client, 'new_index', { properties: {} });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('updateAndPickupMappings', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.updateAndPickupMappings(client, 'new_index', { properties: {} });
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
      const task = Actions.searchForOutdatedDocuments(client, 'new_index', { properties: {} });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });

  describe('bulkOverwriteTransformedDocuments', () => {
    it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
      const task = Actions.bulkOverwriteTransformedDocuments(client, 'new_index', []);
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });
  });
});
