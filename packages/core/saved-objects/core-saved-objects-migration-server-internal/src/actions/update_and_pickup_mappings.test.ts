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
import { updateAndPickupMappings } from './update_and_pickup_mappings';
import { DEFAULT_TIMEOUT } from './constants';
import { pickupUpdatedMappings } from './pickup_updated_mappings';

jest.mock('./catch_retryable_es_client_errors');
jest.mock('./pickup_updated_mappings');

describe('updateAndPickupMappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('putMappingTask', () => {
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
      const task = updateAndPickupMappings({
        client,
        index: 'new_index',
        mappings: { properties: {} },
        batchSize: 1000,
      });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
    });

    it('calls the indices.putMapping with the mapping properties as well as the _meta information', async () => {
      const task = updateAndPickupMappings({
        client,
        index: 'new_index',
        mappings: {
          properties: {
            'apm-indices': {
              type: 'object',
              dynamic: false,
            },
          },
          _meta: {
            migrationMappingPropertyHashes: {
              references: '7997cf5a56cc02bdc9c93361bde732b0',
              'epm-packages': '860e23f4404fa1c33f430e6dad5d8fa2',
              'cases-connector-mappings': '17d2e9e0e170a21a471285a5d845353c',
            },
          },
        },
        batchSize: 1000,
      });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(client.indices.putMapping).toHaveBeenCalledTimes(1);
      expect(client.indices.putMapping).toHaveBeenCalledWith({
        index: 'new_index',
        timeout: DEFAULT_TIMEOUT,
        properties: {
          'apm-indices': {
            type: 'object',
            dynamic: false,
          },
        },
        _meta: {
          migrationMappingPropertyHashes: {
            references: '7997cf5a56cc02bdc9c93361bde732b0',
            'epm-packages': '860e23f4404fa1c33f430e6dad5d8fa2',
            'cases-connector-mappings': '17d2e9e0e170a21a471285a5d845353c',
          },
        },
      });
    });
  });

  describe('pickupUpdatedMappings', () => {
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createSuccessTransportRequestPromise({})
    );

    it('calls pickupUpdatedMappings with the right parameters', async () => {
      const query = {
        bool: {
          should: [
            {
              term: {
                type: 'type1',
              },
            },
            {
              term: {
                type: 'type2',
              },
            },
          ],
        },
      };
      const task = updateAndPickupMappings({
        client,
        index: 'new_index',
        mappings: { properties: {} },
        batchSize: 1000,
        query,
      });
      try {
        await task();
      } catch (e) {
        /** ignore */
      }

      expect(pickupUpdatedMappings).toHaveBeenCalledTimes(1);
      expect(pickupUpdatedMappings).toHaveBeenCalledWith(client, 'new_index', 1000, query);
    });
  });
});
