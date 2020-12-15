/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';

describe('catchRetryableEsClientErrors', () => {
  it('rejects non-retryable response errors', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        body: { error: { type: 'cluster_block_exception' } },
        statusCode: 400,
      })
    );
    return expect(Promise.reject(error).catch(catchRetryableEsClientErrors)).rejects.toBe(error);
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
