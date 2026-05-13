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
import { apiTest, ESE_API_PATH, COMMON_HEADERS, verifyErrorResponse } from '../../fixtures';

const ROLLUP_ARCHIVE = 'x-pack/platform/test/fixtures/es_archives/hybrid/rollup';

apiTest.describe('ese search - rollup (stateful only)', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    await esArchiver.loadIfNeeded(ROLLUP_ARCHIVE);
  });

  apiTest('should return 400 if rollup search is called without index', async ({ apiClient }) => {
    const response = await apiClient.post(ESE_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: {
        indexType: 'rollup',
        params: {
          body: { query: { match_all: {} } },
        },
      },
    });

    expect(response).toHaveStatusCode(400);
    verifyErrorResponse(
      response.body,
      400,
      '"params.index" is required when performing a rollup search',
      false
    );
  });

  apiTest(
    'should return 400 if rollup search is with non-existent index',
    async ({ apiClient }) => {
      const response = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          indexType: 'rollup',
          params: {
            index: 'banana',
            body: { query: { match_all: {} } },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      verifyErrorResponse(response.body, 400, 'illegal_argument_exception', true);
    }
  );

  apiTest('should execute a rollup search', async ({ apiClient }) => {
    const response = await apiClient.post(ESE_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: {
        indexType: 'rollup',
        params: {
          index: 'rollup_logstash',
          size: 0,
          body: { query: { match_all: {} } },
        },
      },
    });

    expect(response).toHaveStatusCode(200);
  });
});
