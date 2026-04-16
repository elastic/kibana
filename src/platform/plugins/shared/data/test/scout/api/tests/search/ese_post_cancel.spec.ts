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
  shardDelayAgg,
} from '../../fixtures';

apiTest.describe(
  'ese search - cancel async search (stateful, SNAPSHOT only)',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      const info = await esClient.info();
      if (!info.version.number.includes('SNAPSHOT')) {
        apiTest.skip(true, 'Requires shard_delay agg (SNAPSHOT builds only)');
      }
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

    apiTest('should cancel an async search without server crash', async ({ apiClient }) => {
      const response = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          params: {
            index: TEST_INDEX,
            body: { query: { match_all: {} }, ...shardDelayAgg('10s') },
            wait_for_completion_timeout: '1ms',
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      const { id } = response.body;
      expect(id).toBeDefined();
      expect(response.body.isPartial).toBe(true);
      expect(response.body.isRunning).toBe(true);

      // Fire a long-polling request and abort it after 2s to create a race
      const controller = new AbortController();
      const pollPromise = apiClient.post(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { params: { wait_for_completion_timeout: '10s' } },
        signal: controller.signal,
      });

      await new Promise((resolve) =>
        setTimeout(() => {
          controller.abort();
          resolve(null);
        }, 2000)
      );

      // Cancel the search server-side; the abort above should not crash the server
      const deleteResponse = await apiClient.delete(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(deleteResponse).toHaveStatusCode(200);

      let abortError: Error | undefined;
      try {
        await pollPromise;
      } catch (e) {
        abortError = e as Error;
      }
      expect(abortError).toBeDefined();

      // Confirm the search was cancelled
      const refetchResponse = await apiClient.post(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {},
      });
      expect(refetchResponse).toHaveStatusCode(404);
    });
  }
);
