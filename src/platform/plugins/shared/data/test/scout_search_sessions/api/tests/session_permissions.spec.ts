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
import { apiTest, SESSION_API_PATH, COMMON_HEADERS, randomSessionId } from '../fixtures';

apiTest.describe(
  'search session - permissions (stateful only)',
  { tag: [...tags.stateful.classic] },
  () => {
    let analystCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      // Role with only dashboard read — no session store privileges
      ({ cookieHeader: analystCookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { dashboard: ['read'] }, spaces: ['*'] }],
      }));
    });

    apiTest(
      'should 403 if no app gives permissions to store search sessions',
      async ({ apiClient }) => {
        const sessionId = randomSessionId();

        const createResponse = await apiClient.post(SESSION_API_PATH, {
          headers: { ...COMMON_HEADERS, ...analystCookieHeader },
          body: {
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          },
        });
        expect(createResponse).toHaveStatusCode(403);

        const getResponse = await apiClient.get(`${SESSION_API_PATH}/${sessionId}`, {
          headers: { ...COMMON_HEADERS, ...analystCookieHeader },
        });
        expect(getResponse).toHaveStatusCode(403);
      }
    );
  }
);
