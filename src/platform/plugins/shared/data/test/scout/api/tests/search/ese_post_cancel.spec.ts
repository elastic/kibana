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

    apiTest.beforeAll(async ({ samlAuth, esClient, isSnapshotBuild }) => {
      // Throwing skip from beforeAll aborts the hook and marks every test in
      // this describe as skipped, so none of the tests below will run.
      apiTest.skip(!isSnapshotBuild, 'Requires shard_delay agg (SNAPSHOT builds only)');
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
      const pollPromise = apiClient
        .post(`${ESE_API_PATH}/${id}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { params: { wait_for_completion_timeout: '10s' } },
          signal: controller.signal,
        })
        .catch((e: Error) => e);

      await new Promise((resolve) =>
        setTimeout(() => {
          controller.abort();
          resolve(null);
        }, 2000)
      );

      // Wait for the abort to fully settle
      const abortResult = await pollPromise;
      expect(abortResult instanceof Error).toBe(true);

      // Delete the search server-side; accept 200 (still alive) or 404 (abort
      // already triggered server-side cleanup) — the key assertion is that
      // Kibana did not crash.
      const deleteResponse = await apiClient.delete(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(deleteResponse).toHaveStatusCode({ oneOf: [200, 404] });

      // Confirm the server is still healthy after the abort + delete race
      const healthCheck = await apiClient.get('/api/status', {
        headers: { ...cookieHeader },
      });
      expect(healthCheck).toHaveStatusCode(200);
    });
  }
);
