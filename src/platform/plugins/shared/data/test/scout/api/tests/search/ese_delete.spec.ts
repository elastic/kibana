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
  waitFor,
} from '../../fixtures';

apiTest.describe(
  'ese search - delete',
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

    apiTest('should return 404 when no search id provided', async ({ apiClient }) => {
      const response = await apiClient.delete(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('should return 400 when trying to delete a bad id', async ({ apiClient }) => {
      const response = await apiClient.delete(`${ESE_API_PATH}/123`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('illegal_argument_exception');
      expect(response.body.attributes).toBeDefined();
      expect(response.body.attributes.root_cause).toBeDefined();
    });

    apiTest('should delete an in-progress search', async ({ apiClient, isSnapshotBuild }) => {
      apiTest.skip(!isSnapshotBuild, 'Requires shard_delay agg (SNAPSHOT builds only)');

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

      const deleteResponse = await apiClient.delete(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const refetchResponse = await apiClient.post(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {},
      });
      expect(refetchResponse).toHaveStatusCode(404);
    });

    apiTest('should delete a completed search', async ({ apiClient, isSnapshotBuild }) => {
      apiTest.skip(!isSnapshotBuild, 'Requires shard_delay agg (SNAPSHOT builds only)');

      const response = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          params: {
            index: TEST_INDEX,
            body: { query: { match_all: {} }, ...shardDelayAgg('3s') },
            wait_for_completion_timeout: '1ms',
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      const { id } = response.body;
      expect(id).toBeDefined();
      expect(response.body.isPartial).toBe(true);
      expect(response.body.isRunning).toBe(true);

      await waitFor(
        async () => {
          const pollResponse = await apiClient.post(`${ESE_API_PATH}/${id}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
            body: {},
          });
          return !pollResponse.body.isRunning && !pollResponse.body.isPartial;
        },
        { timeout: 30_000, interval: 2_000 }
      );

      const deleteResponse = await apiClient.delete(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const refetchResponse = await apiClient.post(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {},
      });
      expect(refetchResponse).toHaveStatusCode(404);
    });
  }
);
