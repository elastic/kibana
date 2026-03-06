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
import {
  catchRetryableEsClientErrors,
  catchRetryableSearchPhaseExecutionException,
} from './catch_retryable_es_client_errors';

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
    it.each([504, 503, 502, 401, 403, 408, 410, 429])(
      'ResponseError with retryable status code (%d)',
      async (status) => {
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
      }
    );
  });
});

describe('catchRetryableSearchPhaseExecutionException', () => {
  it('retries search phase execution exception', async () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        body: {
          error: {
            type: 'search_phase_execution_exception',
            caused_by: {
              type: 'search_phase_execution_exception',
              reason:
                'Search rejected due to missing shards [.kibana]. Consider using `allow_partial_search_results` setting to bypass this error.',
            },
          },
        },
      })
    );
    expect(
      ((await Promise.reject(error).catch(catchRetryableSearchPhaseExecutionException)) as any).left
    ).toMatchInlineSnapshot(`
      Object {
        "error": [ResponseError: search_phase_execution_exception
      	Caused by:
      		search_phase_execution_exception: Search rejected due to missing shards [.kibana]. Consider using \`allow_partial_search_results\` setting to bypass this error.],
        "message": "search_phase_execution_exception
      	Caused by:
      		search_phase_execution_exception: Search rejected due to missing shards [.kibana]. Consider using \`allow_partial_search_results\` setting to bypass this error.",
        "type": "retryable_es_client_error",
      }
    `);
  });
});
