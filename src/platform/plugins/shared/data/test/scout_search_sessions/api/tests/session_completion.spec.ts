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
  SESSION_API_PATH,
  ESE_API_PATH,
  COMMON_HEADERS,
  waitFor,
  randomSessionId,
  randomHash,
} from '../fixtures';

apiTest.describe(
  'search session - completion (stateful only)',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest('should complete session when searches complete', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      const searchParams = {
        body: { query: { term: { agent: '1' } } },
        wait_for_completion_timeout: '1ms',
      };

      // Run search
      const searchRes = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { sessionId, params: searchParams, requestHash: randomHash() },
      });
      expect(searchRes).toHaveStatusCode(200);
      const { id } = searchRes.body;

      // Persist session
      await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });

      // Run search to persist into session
      await apiClient.post(`${ESE_API_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          params: searchParams,
          isStored: true,
          requestHash: randomHash(),
        },
      });

      // Wait for search to be persisted into the session
      await waitFor(
        async () => {
          const resp = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
          });
          if (resp.statusCode !== 200) return false;
          const idMappings = Object.values(resp.body.attributes.idMapping).map((v: any) => v.id);
          return idMappings.includes(id);
        },
        true,
        { timeout: 15_000, interval: 2_000 }
      );

      // Wait for session to reach complete state
      await waitFor(
        async () => {
          const resp = await apiClient.get(`${SESSION_API_PATH}/${sessionId}/status`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
          });
          return resp.body.status;
        },
        'complete',
        { timeout: 30_000, interval: 2_000 }
      );
    });
  }
);
