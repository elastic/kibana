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
import { apiTest, ESE_API_PATH, COMMON_HEADERS, TEST_INDEX, TEST_DOC_ID } from '../../fixtures';

apiTest.describe(
  'ese search - privileges (stateful only)',
  { tag: [...tags.stateful.classic] },
  () => {
    let restrictedCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      await esClient.index({
        index: TEST_INDEX,
        id: TEST_DOC_ID,
        document: { message: 'test doc' },
        refresh: 'wait_for',
      });

      // KibanaRole format: restricted read on 'shakespeare' only, no kibana privileges
      ({ cookieHeader: restrictedCookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['shakespeare'], privileges: ['read'] }],
        },
        kibana: [],
      }));
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: TEST_INDEX }).catch(() => {});
    });

    apiTest('should return 403 for lack of privileges', async ({ apiClient }) => {
      const response = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...restrictedCookieHeader },
        body: {
          params: {
            index: TEST_INDEX,
            body: { query: { match_all: {} } },
            wait_for_completion_timeout: '10s',
            // Override the default ignore_unavailable=true so ES enforces index privileges
            ignore_unavailable: false,
          },
        },
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);
