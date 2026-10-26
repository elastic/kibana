/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, verifyErrorResponse } from '../../fixtures';

const ES_INDEX = 'search-api-es-strategy-test';

apiTest.describe(
  'es search strategy - post, delete and error handling',
  { tag: tags.deploymentAgnostic },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...COMMON_HEADERS, ...cookieHeader };
      await esClient.indices.delete({ index: ES_INDEX }, { ignore: [404] });
      await esClient.bulk({
        refresh: 'wait_for',
        operations: Array.from({ length: 5 }, (_, i) => [
          { index: { _index: ES_INDEX, _id: `doc-${i}` } },
          { '@timestamp': '2020-01-01T00:00:00.000Z', message: `doc ${i}` },
        ]).flat(),
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: ES_INDEX }, { ignore: [404] });
    });

    apiTest(
      'should return 200 when correctly formatted searches are provided',
      async ({ apiClient }) => {
        const response = await apiClient.post('/internal/search/es', {
          headers,
          body: { params: { index: ES_INDEX, query: { match_all: {} } } },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.isPartial).toBe(false);
        expect(response.body.isRunning).toBe(false);
        expect(response.body.rawResponse).toBeDefined();
        expect(response.headers[ELASTIC_HTTP_VERSION_HEADER]).toBe('1');
      }
    );

    apiTest('should return 200 if terminated early', async ({ apiClient }) => {
      const response = await apiClient.post('/internal/search/es', {
        headers,
        body: {
          params: {
            terminateAfter: 1,
            index: ES_INDEX,
            size: 1000,
            query: { match_all: {} },
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.isPartial).toBe(false);
      expect(response.body.isRunning).toBe(false);
      expect(response.body.rawResponse.terminated_early).toBe(true);
      expect(response.headers[ELASTIC_HTTP_VERSION_HEADER]).toBe('1');
    });

    apiTest('should return 404 when if unknown strategy is provided', async ({ apiClient }) => {
      const response = await apiClient.post('/internal/search/banana', {
        headers,
        body: { query: { match_all: {} } },
      });

      expect(response).toHaveStatusCode(404);
      verifyErrorResponse(response.body, 404);
      expect(response.body.message).toContain('banana not found');
      expect(response.headers[ELASTIC_HTTP_VERSION_HEADER]).toBe('1');
    });

    apiTest('should return 400 with illegal ES argument', async ({ apiClient }) => {
      const response = await apiClient.post('/internal/search/es', {
        headers,
        body: {
          params: {
            timeout: 1, // This should be a time range string!
            index: ES_INDEX,
            size: 1000,
            query: { match_all: {} },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      verifyErrorResponse(response.body, 400, 'illegal_argument_exception', true);
    });

    apiTest('should return 400 with a bad body', async ({ apiClient }) => {
      const response = await apiClient.post('/internal/search/es', {
        headers,
        body: { params: { body: { index: 'nope nope', bad_query: [] } } },
      });

      expect(response).toHaveStatusCode(400);
      verifyErrorResponse(response.body, 400, 'parsing_exception', true);
    });

    apiTest('should return 400 for a painless error', async ({ apiClient }) => {
      const response = await apiClient.post('/internal/search/es', {
        headers,
        body: {
          params: {
            index: ES_INDEX,
            size: 500,
            fields: ['*'],
            script_fields: {
              invalid_scripted_field: { script: { source: 'invalid', lang: 'painless' } },
            },
            stored_fields: ['*'],
            query: { bool: { filter: [{ match_all: {} }] } },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      verifyErrorResponse(response.body, 400, 'search_phase_execution_exception', true);
    });

    apiTest(
      'should return 400 when trying a delete on a non supporting strategy',
      async ({ apiClient }) => {
        const response = await apiClient.delete('/internal/search/es/123', { headers });

        expect(response).toHaveStatusCode(400);
        verifyErrorResponse(response.body, 400);
        expect(response.body.message).toContain("Search strategy es doesn't support cancellations");
        expect(response.headers[ELASTIC_HTTP_VERSION_HEADER]).toBe('1');
      }
    );
  }
);
