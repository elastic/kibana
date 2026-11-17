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

const DELAY_SECONDS = 4;

apiTest.describe(
  'ese search - long polling (SNAPSHOT only)',
  { tag: [...tags.stateful.all, ...tags.serverless.search] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esClient, isSnapshotBuild }) => {
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
      'holds a poll open until the search completes when pollLength is set',
      async ({ apiClient }) => {
        const headers = { ...COMMON_HEADERS, ...cookieHeader };
        const submit = await apiClient.post(ESE_API_PATH, {
          headers,
          body: {
            params: {
              index: TEST_INDEX,
              body: { query: { match_all: {} }, ...shardDelayAgg(`${DELAY_SECONDS}s`) },
              wait_for_completion_timeout: '1ms',
            },
          },
        });
        expect(submit).toHaveStatusCode(200);
        expect(submit.body.isRunning, 'submit should still be running').toBe(true);

        const start = Date.now();
        const poll = await apiClient.post(`${ESE_API_PATH}/${submit.body.id}`, {
          headers,
          body: { pollLength: '15s' },
        });
        const elapsed = Date.now() - start;

        expect(poll).toHaveStatusCode(200);
        expect(poll.body.isRunning, `poll should have completed, elapsed=${elapsed}ms`).toBe(false);
        expect(poll.body.isPartial, `poll should not be partial, elapsed=${elapsed}ms`).toBe(false);
        expect(elapsed, 'poll should be held open').toBeGreaterThan((DELAY_SECONDS * 1000) / 2);
      }
    );
  }
);
