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
  'search session - management (stateful only)',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest('should fail to create a session with no name', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      const response = await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('should create and get a session', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      const createResponse = await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });
      expect(createResponse).toHaveStatusCode(200);

      const getResponse = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(getResponse).toHaveStatusCode(200);
    });

    apiTest('should fail to delete an unknown session', async ({ apiClient }) => {
      const response = await apiClient.delete(`${SESSION_API_PATH}/123`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('should create and delete a session', async ({ apiClient }) => {
      const sessionId = randomSessionId();
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

      const deleteResponse = await apiClient.delete(`${SESSION_API_PATH}/${sessionId}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const getResponse = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(getResponse).toHaveStatusCode(404);
    });

    apiTest('should create and cancel a session', async ({ apiClient }) => {
      const sessionId = randomSessionId();
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

      const cancelResponse = await apiClient.post(`${SESSION_API_PATH}/${sessionId}/cancel`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(cancelResponse).toHaveStatusCode(200);

      const statusResponse = await apiClient.get(`${SESSION_API_PATH}/${sessionId}/status`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(statusResponse).toHaveStatusCode(200);
      expect(statusResponse.body.status).toBe('cancelled');
    });

    apiTest('should rename a session', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      const createResponse = await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          name: 'name1',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });
      expect(createResponse).toHaveStatusCode(200);

      const updateResponse = await apiClient.put(`${SESSION_API_PATH}/${sessionId}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { name: 'name2' },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.attributes.name).not.toBe(createResponse.body.attributes.name);
      expect(updateResponse.body.attributes.name).toBe('name2');
    });

    apiTest('should sync search ids into saved session', async ({ apiClient }) => {
      const sessionId = randomSessionId();

      // Run search before session is saved (will not be persisted)
      const search1 = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          params: {
            body: { query: { term: { agent: '1' } } },
            wait_for_completion_timeout: '1ms',
          },
          requestHash: randomHash(),
        },
      });
      expect(search1).toHaveStatusCode(200);
      const id1 = search1.body.id;

      // Save session
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

      // Run search after session is saved (should be persisted)
      const search2 = await apiClient.post(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          sessionId,
          isStored: true,
          params: {
            body: { query: { match_all: {} } },
            wait_for_completion_timeout: '1ms',
          },
          requestHash: randomHash(),
        },
      });
      expect(search2).toHaveStatusCode(200);
      const id2 = search2.body.id;

      await waitFor(
        async () => {
          const resp = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
          });
          if (resp.statusCode !== 200) return false;
          const idMappings = Object.values(resp.body.attributes.idMapping).map((v: any) => v.id);
          return !idMappings.includes(id1) && idMappings.includes(id2);
        },
        true,
        { timeout: 15_000, interval: 2_000 }
      );
    });

    apiTest('should create and extend a session', async ({ apiClient }) => {
      const sessionId = randomSessionId();
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

      const extendResponse = await apiClient.post(`${SESSION_API_PATH}/${sessionId}/_extend`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { expires: '2021-02-26T21:02:43.742Z' },
      });
      expect(extendResponse).toHaveStatusCode(200);
    });

    apiTest('should fail to extend a nonexistent session', async ({ apiClient }) => {
      const response = await apiClient.post(`${SESSION_API_PATH}/123/_extend`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { expires: '2021-02-26T21:02:43.742Z' },
      });
      expect(response).toHaveStatusCode(404);
    });
  }
);
