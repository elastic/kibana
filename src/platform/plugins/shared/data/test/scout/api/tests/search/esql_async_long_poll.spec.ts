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
import { apiTest, COMMON_HEADERS, stallQuery } from '../../fixtures';

const ESQL_INDEX = 'search-api-esql-async-long-poll-test';
const ESQL_PATH = '/internal/search/esql_async';
const DELAY_SECONDS = 4;

// ES|QL async is available on stateful; serverless is not covered here
apiTest.describe(
  'esql_async search strategy - long polling (SNAPSHOT only)',
  { tag: tags.stateful.classic },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esClient, isSnapshotBuild }) => {
      apiTest.skip(!isSnapshotBuild, 'Requires error_query stalling (SNAPSHOT builds only)');
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...COMMON_HEADERS, ...cookieHeader };
      await esClient.indices.delete({ index: ESQL_INDEX }).catch(() => {});
      await esClient.index({
        index: ESQL_INDEX,
        id: 'doc-1',
        document: { '@timestamp': '2020-01-01T00:00:00.000Z', message: 'doc' },
        refresh: 'wait_for',
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: ESQL_INDEX }).catch(() => {});
    });

    apiTest(
      'holds a poll open until the search completes when pollLength is set',
      async ({ apiClient }) => {
        const submit = await apiClient.post(ESQL_PATH, {
          headers,
          body: {
            params: {
              query: `FROM ${ESQL_INDEX} | KEEP message`,
              filter: stallQuery(DELAY_SECONDS),
              wait_for_completion_timeout: '1ms',
            },
          },
        });
        expect(submit).toHaveStatusCode(200);
        expect(submit.body.isRunning, 'submit should still be running').toBe(true);

        const start = Date.now();
        const poll = await apiClient.post(`${ESQL_PATH}/${submit.body.id}`, {
          headers,
          body: { pollLength: '15s' },
        });
        const elapsed = Date.now() - start;

        expect(poll).toHaveStatusCode(200);
        expect(poll.body.isRunning, `poll should have completed, elapsed=${elapsed}ms`).toBe(false);
        expect(elapsed, 'poll should be held open').toBeGreaterThan((DELAY_SECONDS * 1000) / 2);
      }
    );
  }
);
