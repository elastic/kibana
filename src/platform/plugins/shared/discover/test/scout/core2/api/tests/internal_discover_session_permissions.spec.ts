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
import { v4 as uuidv4 } from 'uuid';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionInternalData } from '../../../../../server/api/internal_schema';
import { DISCOVER_SESSION_INTERNAL_API_BASE_PATH } from '../../../../../common/constants';
import { BASE_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Internal Discover session write permissions',
  { tag: tags.deploymentAgnostic },
  () => {
    let sessionId: string;
    let sessionData: DiscoverSessionInternalData;
    let viewerHeaders: Record<string, string>;
    let editorHeaders: Record<string, string>;
    let inlineDataViewId: string;
    const sessionIds: string[] = [];

    apiTest.beforeAll(async ({ apiServices, apiClient, samlAuth }) => {
      sessionId = await apiServices.discover.create({
        title: 'Read-only internal session',
        tabs: [
          {
            id: 'main',
            label: 'Main',
            data_source: { type: 'data_view_spec', index_pattern: 'logs-*' },
          },
        ],
      });
      sessionIds.push(sessionId);
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      viewerHeaders = { ...BASE_HEADERS, 'elastic-api-version': '1', ...cookieHeader };
      const editor = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
      });
      editorHeaders = { ...BASE_HEADERS, 'elastic-api-version': '1', ...editor.cookieHeader };

      const response = await apiClient.get(
        `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/${sessionId}`,
        {
          headers: viewerHeaders,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.title).toBe('Read-only internal session');

      inlineDataViewId = response.body.data.tabs[0].data_source.id;
      expect(inlineDataViewId).toMatch(/\S/);
      expect(response.body.data.tabs[0].data_source).toStrictEqual({
        type: 'data_view_spec',
        index_pattern: 'logs-*',
        id: inlineDataViewId,
      });
      sessionData = response.body.data;
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.bulkDelete({
        objects: sessionIds.map((id) => ({ type: 'search', id })),
      });
    });

    apiTest('forbids creating a session as a read-only user', async ({ apiClient }) => {
      const response = await apiClient.post(DISCOVER_SESSION_INTERNAL_API_BASE_PATH, {
        headers: viewerHeaders,
        body: sessionData,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'forbids creating a missing session through PUT as a read-only user',
      async ({ apiClient }) => {
        const id = uuidv4();
        sessionIds.push(id);
        const path = `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/${id}`;

        const response = await apiClient.put(path, {
          headers: viewerHeaders,
          body: sessionData,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);

        const loaded = await apiClient.get(path, {
          headers: editorHeaders,
          responseType: 'json',
        });

        expect(loaded).toHaveStatusCode(404);
      }
    );

    apiTest(
      'creates a missing session through PUT and preserves its inline Data View ID',
      async ({ apiClient, kbnClient }) => {
        const id = uuidv4();
        sessionIds.push(id);
        const path = `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/${id}`;

        const response = await apiClient.put(path, {
          headers: editorHeaders,
          body: sessionData,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(201);
        expect(response.body).toMatchObject({ id, data: sessionData });

        const loaded = await apiClient.get(path, {
          headers: editorHeaders,
          responseType: 'json',
        });

        expect(loaded).toHaveStatusCode(200);
        expect(loaded.body).toMatchObject({ id, data: sessionData });

        const stored = await kbnClient.savedObjects.get<DiscoverSessionAttributes>({
          type: 'search',
          id,
        });

        expect(
          JSON.parse(stored.attributes.tabs[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)
            .index
        ).toStrictEqual({ id: inlineDataViewId, title: 'logs-*' });
      }
    );

    apiTest(
      'forbids replacing an existing session and leaves it unchanged',
      async ({ apiClient }) => {
        const response = await apiClient.put(
          `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/${sessionId}`,
          {
            headers: viewerHeaders,
            body: {
              ...sessionData,
              title: 'Forbidden replacement',
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
        expect(loaded.body.data).toStrictEqual(sessionData);
      }
    );
  }
);
