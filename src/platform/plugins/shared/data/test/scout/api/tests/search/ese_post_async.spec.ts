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
  'ese search - post async (SNAPSHOT only)',
  { tag: [...tags.stateful.all, ...tags.serverless.search] },
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

    apiTest(
      'should return 200 with search id and partial response if wait_for_completion_timeout is not long enough',
      async ({ apiClient }) => {
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
        expect(response.body.id).toBeDefined();
        expect(response.body.isPartial).toBe(true);
        expect(response.body.isRunning).toBe(true);
        expect(response.body.rawResponse).toBeDefined();
      }
    );

    apiTest(
      'should retrieve results from completed search with search id',
      async ({ apiClient }) => {
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

        await waitFor(
          async () => {
            const pollResponse = await apiClient.post(`${ESE_API_PATH}/${id}`, {
              headers: { ...COMMON_HEADERS, ...cookieHeader },
              body: {},
            });
            if (!pollResponse.body.isRunning && !pollResponse.body.isPartial) {
              // eslint-disable-next-line playwright/no-conditional-expect
              expect(pollResponse.body.id).toBeDefined();
              return true;
            }
            return false;
          },
          { timeout: 15_000, interval: 2_000 }
        );
      }
    );

    apiTest(
      'should retrieve results from in-progress search with search id',
      async ({ apiClient }) => {
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

        const pollResponse = await apiClient.post(`${ESE_API_PATH}/${id}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {},
        });

        expect(pollResponse).toHaveStatusCode(200);
        expect(pollResponse.body.id).toBeDefined();
        expect(pollResponse.body.isPartial).toBe(true);
        expect(pollResponse.body.isRunning).toBe(true);
      }
    );
  }
);
