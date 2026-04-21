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

      // Send a follow-up request that waits up to 10s for completion. We'll
      // abort it after 2s and immediately fire DELETE so the abort and the
      // cancellation race on the server. This must not crash Kibana, and the
      // search must end up cancelled.
      const controller = new AbortController();
      const pollPromise = apiClient
        .post(`${ESE_API_PATH}/${id}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { params: { wait_for_completion_timeout: '10s' } },
          signal: controller.signal,
        })
        .catch((e: Error) => e);

      await new Promise((resolve) => setTimeout(resolve, 2000));
      controller.abort();

      const deleteResponse = await apiClient.delete(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const abortResult = await pollPromise;
      expect(abortResult instanceof Error).toBe(true);

      // Confirm the search was actually cancelled (a fresh poll should 404).
      const refetchResponse = await apiClient.post(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {},
      });
      expect(refetchResponse).toHaveStatusCode(404);
    });
  }
);
