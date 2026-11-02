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
  SESSION_VERSION_HEADER,
  COMMON_HEADERS,
  randomSessionId,
} from '../fixtures';

apiTest.describe(
  'search session - cross-user security (stateful only)',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCookieHeader: Record<string, string>;
    let otherUserCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: otherUserCookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: ['all'], indices: [{ names: ['*'], privileges: ['all'] }] },
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      }));
    });

    apiTest('should prevent users from accessing other users sessions', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...adminCookieHeader },
        body: {
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });

      const response = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
        headers: { ...COMMON_HEADERS, ...otherUserCookieHeader },
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('should prevent users from deleting other users sessions', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...adminCookieHeader },
        body: {
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });

      const response = await apiClient.delete(`${SESSION_API_PATH}/${sessionId}`, {
        headers: { ...COMMON_HEADERS, ...otherUserCookieHeader },
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('should prevent users from cancelling other users sessions', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...adminCookieHeader },
        body: {
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });

      const response = await apiClient.post(`${SESSION_API_PATH}/${sessionId}/cancel`, {
        headers: { ...COMMON_HEADERS, ...otherUserCookieHeader },
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('should prevent users from extending other users sessions', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      await apiClient.post(SESSION_API_PATH, {
        headers: { ...COMMON_HEADERS, ...adminCookieHeader },
        body: {
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });

      const response = await apiClient.post(`${SESSION_API_PATH}/${sessionId}/_extend`, {
        headers: { ...COMMON_HEADERS, ...otherUserCookieHeader },
        body: { expires: '2021-02-26T21:02:43.742Z' },
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('should prevent unauthorized users from creating sessions', async ({ apiClient }) => {
      const sessionId = randomSessionId();
      // No auth headers — unauthenticated request. Version header is kept so the
      // 401 isolates the auth check rather than failing on missing version.
      const response = await apiClient.post(SESSION_API_PATH, {
        headers: { ...SESSION_VERSION_HEADER, 'kbn-xsrf': 'foo' },
        body: {
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        },
      });
      expect(response).toHaveStatusCode(401);
    });
  }
);
