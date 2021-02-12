/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';

describe('catchRetryableEsClientErrors', () => {
  it('rejects non-retryable response errors', async () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        body: { error: { type: 'cluster_block_exception' } },
        statusCode: 400,
      })
    );
    await expect(Promise.reject(error).catch(catchRetryableEsClientErrors)).rejects.toBe(error);
  });
  describe('returns left retryable_es_client_error for', () => {
    it('NoLivingConnectionsError', async () => {
      const error = new esErrors.NoLivingConnectionsError(
        'reason',
        elasticsearchClientMock.createApiResponse()
      );
      expect(
        ((await Promise.reject(error).catch(catchRetryableEsClientErrors)) as any).left
      ).toMatchObject({
        message: 'reason',
        type: 'retryable_es_client_error',
      });
    });

    it('ConnectionError', async () => {
      const error = new esErrors.ConnectionError(
        'reason',
        elasticsearchClientMock.createApiResponse()
      );
      expect(
        ((await Promise.reject(error).catch(catchRetryableEsClientErrors)) as any).left
      ).toMatchObject({
        message: 'reason',
        type: 'retryable_es_client_error',
      });
    });
    it('TimeoutError', async () => {
      const error = new esErrors.TimeoutError(
        'reason',
        elasticsearchClientMock.createApiResponse()
      );
      expect(
        ((await Promise.reject(error).catch(catchRetryableEsClientErrors)) as any).left
      ).toMatchObject({
        message: 'reason',
        type: 'retryable_es_client_error',
      });
    });
    it('ResponseError of type snapshot_in_progress_exception', async () => {
      const error = new esErrors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          body: { error: { type: 'snapshot_in_progress_exception' } },
        })
      );
      expect(
        ((await Promise.reject(error).catch(catchRetryableEsClientErrors)) as any).left
      ).toMatchObject({
        message: 'snapshot_in_progress_exception',
        type: 'retryable_es_client_error',
      });
    });
    it('ResponseError with retryable status code', async () => {
      const statusCodes = [503, 401, 403, 408, 410];
      return Promise.all(
        statusCodes.map(async (status) => {
          const error = new esErrors.ResponseError(
            elasticsearchClientMock.createApiResponse({
              statusCode: status,
              body: { error: { type: 'reason' } },
            })
          );
          expect(
            ((await Promise.reject(error).catch(catchRetryableEsClientErrors)) as any).left
          ).toMatchObject({
            message: 'reason',
            type: 'retryable_es_client_error',
          });
        })
      );
    });
  });
});
