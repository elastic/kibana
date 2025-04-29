/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { isRetryableEsClientError } from './retryable_es_client_errors';

describe('isRetryableEsClientError', () => {
  describe('returns `false` for', () => {
    test('non-retryable response errors', async () => {
      const error = new esErrors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          body: { error: { type: 'cluster_block_exception' } },
          statusCode: 400,
        })
      );

      expect(isRetryableEsClientError(error)).toEqual(false);
    });
  });

  describe('returns `true` for', () => {
    it('NoLivingConnectionsError', () => {
      const error = new esErrors.NoLivingConnectionsError(
        'reason',
        elasticsearchClientMock.createApiResponse()
      );

      expect(isRetryableEsClientError(error)).toEqual(true);
    });

    it('ConnectionError', () => {
      const error = new esErrors.ConnectionError(
        'reason',
        elasticsearchClientMock.createApiResponse()
      );
      expect(isRetryableEsClientError(error)).toEqual(true);
    });

    it('TimeoutError', () => {
      const error = new esErrors.TimeoutError(
        'reason',
        elasticsearchClientMock.createApiResponse()
      );
      expect(isRetryableEsClientError(error)).toEqual(true);
    });

    it('ResponseError of type snapshot_in_progress_exception', () => {
      const error = new esErrors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          body: { error: { type: 'snapshot_in_progress_exception' } },
        })
      );
      expect(isRetryableEsClientError(error)).toEqual(true);
    });

    it.each([503, 504, 401, 403, 408, 410, 429])(
      'ResponseError with %p status code',
      (statusCode) => {
        const error = new esErrors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode,
            body: { error: { type: 'reason' } },
          })
        );

        expect(isRetryableEsClientError(error)).toEqual(true);
      }
    );
  });
});
