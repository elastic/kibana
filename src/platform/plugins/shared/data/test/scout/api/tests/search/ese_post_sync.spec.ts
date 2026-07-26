/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  ESE_API_PATH,
  TEST_INDEX,
  TEST_DOC_ID,
  COMMON_HEADERS,
  FAKE_ASYNC_ID,
  verifyErrorResponse,
} from '../../fixtures';

apiTest.describe(
  'ese search - post sync and validation',
  { tag: [...tags.stateful.all, ...tags.serverless.search] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      await esClient.index({
        index: TEST_INDEX,
        id: TEST_DOC_ID,
        document: { message: 'test doc' },
        refresh: 'wait_for',
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: TEST_INDEX }).catch(() => {});
    });

    apiTest(
      'should return 200 with final response without search id if wait_for_completion_timeout is long enough',
      async ({ apiClient }) => {
        const response = await apiClient.post(ESE_API_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            params: {
              index: TEST_INDEX,
              body: { query: { match_all: {} } },
              wait_for_completion_timeout: '10s',
            },
          },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.id).toBeUndefined();
        expect(response.body.isPartial).toBe(false);
        expect(response.body.isRunning).toBe(false);
        expect(response.body.rawResponse).toBeDefined();
      }
    );

    apiTest('should fail without kbn-xsrf header', async ({ apiClient }) => {
      const response = await apiClient.post(ESE_API_PATH, {
        headers: {
          ...cookieHeader,
          'elastic-api-version': '1',
          'x-elastic-internal-origin': 'kibana',
        },
        body: {
          params: {
            index: TEST_INDEX,
            body: { query: { match_all: {} } },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      verifyErrorResponse(response.body, 400, 'Request must contain a kbn-xsrf header.');
    });

    apiTest('should return 400 if invalid id is provided', async ({ apiClient }) => {
      const response = await apiClient.post(`${ESE_API_PATH}/123`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          params: {
            index: TEST_INDEX,
            body: { query: { match_all: {} } },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      verifyErrorResponse(response.body, 400, 'illegal_argument_exception', true);
    });

    apiTest('should return 404 if unknown id is provided', async ({ apiClient }) => {
      const response = await apiClient.post(`${ESE_API_PATH}/${FAKE_ASYNC_ID}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          params: {
            index: TEST_INDEX,
            body: { query: { match_all: {} } },
          },
        },
      });

      expect(response).toHaveStatusCode(404);
      verifyErrorResponse(response.body, 404, 'resource_not_found_exception', true);
    });

    apiTest('should return 400 with a bad body', async ({ apiClient }) => {
      const response = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          params: {
            body: { index: 'nope nope', bad_query: [] },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      verifyErrorResponse(response.body, 400, 'parsing_exception', true);
    });
  }
);
