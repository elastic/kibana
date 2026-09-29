/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { StoredDiscoverSession } from '@kbn/saved-search-plugin/common';
import { DISCOVER_SESSION_INTERNAL_API_BASE_PATH } from '../../../../../common/constants';
import { BASE_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Internal Discover session write permissions',
  { tag: tags.deploymentAgnostic },
  () => {
    let sessionId: string;
    let storedSession: StoredDiscoverSession;
    let viewerHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, apiClient, samlAuth }) => {
      sessionId = await apiServices.discover.create({
        title: 'Read-only internal session',
        tabs: [
          {
            id: 'main',
            label: 'Main',
            data_source: { type: 'esql', query: 'FROM logs-* | LIMIT 10' },
          },
        ],
      });
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      viewerHeaders = { ...BASE_HEADERS, 'elastic-api-version': '1', ...cookieHeader };

      const response = await apiClient.get(
        `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/${sessionId}`,
        {
          headers: viewerHeaders,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.attributes.title).toBe('Read-only internal session');
      storedSession = response.body.data;
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.delete({ type: 'search', id: sessionId });
    });

    apiTest('forbids creating a session as a read-only user', async ({ apiClient }) => {
      const response = await apiClient.post(DISCOVER_SESSION_INTERNAL_API_BASE_PATH, {
        headers: viewerHeaders,
        body: storedSession,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'forbids replacing an existing session and leaves it unchanged',
      async ({ apiClient }) => {
        const response = await apiClient.put(
          `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/${sessionId}`,
          {
            headers: viewerHeaders,
            body: {
              ...storedSession,
              attributes: { ...storedSession.attributes, title: 'Forbidden replacement' },
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(403);

        const loaded = await apiClient.get(
          `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/${sessionId}`,
          {
            headers: viewerHeaders,
            responseType: 'json',
          }
        );

        expect(loaded).toHaveStatusCode(200);
        expect(loaded.body.data).toStrictEqual(storedSession);
      }
    );
  }
);
