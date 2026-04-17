/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  apiTest,
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  KBN_ARCHIVES,
  TEST_DASHBOARD_ID,
} from '../fixtures';

apiTest.describe('dashboards - upsert', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    // returns editor role in most deployment project and deployment types
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
    await kbnClient.importExport.load(
      'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/dashboards_api.json'
    );
    await kbnClient.importExport.load(KBN_ARCHIVES.TAGS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should update existing dashboard', async ({ apiClient }) => {
    const response = await apiClient.put(`${DASHBOARD_API_PATH}/${TEST_DASHBOARD_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'Refresh Requests (Updated)',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(TEST_DASHBOARD_ID);
    expect(response.body.data.title).toBe('Refresh Requests (Updated)');
  });

  apiTest('should update existing dashboard with invalid "as code" id', async ({ apiClient }) => {
    const id = '(my)dashboard';
    const response = await apiClient.put(`${DASHBOARD_API_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'Updated title',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(id);
    expect(response.body.data.title).toBe('Updated title');
  });

  apiTest('should create new dashboard', async ({ apiClient }) => {
    const id = 'new-dashboard-id';
    const title = `I'm a new dashboard`;
    const response = await apiClient.put(`${DASHBOARD_API_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBe(id);
    expect(response.body.data.title).toBe(title);
  });

  apiTest(
    'validation - returns 400 when creating a new dashboard with an invalid id',
    async ({ apiClient }) => {
      const id = '(new)dashboard-id';
      const response = await apiClient.put(`${DASHBOARD_API_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        body: {
          title: `I'm a new dashboard`,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        'ID must contain only lowercase letters, numbers, hyphens, and underscores.'
      );
    }
  );

  apiTest(
    'validation - returns 400 when body is not valid dashboard shape',
    async ({ apiClient }) => {
      const response = await apiClient.put(`${DASHBOARD_API_PATH}/${TEST_DASHBOARD_ID}`, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        body: {},
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        '[request body.title]: expected value of type [string] but got [undefined]'
      );
    }
  );

  apiTest('validation - returns 400 when access_control is provided', async ({ apiClient }) => {
    const response = await apiClient.put(`${DASHBOARD_API_PATH}/${TEST_DASHBOARD_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'Refresh Requests (Updated)',
        access_control: {
          access_mode: 'write_restricted',
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation - returns 403 if user does not have permission to update a dashboard',
    async ({ apiClient }) => {
      const response = await apiClient.put(`${DASHBOARD_API_PATH}/${TEST_DASHBOARD_ID}`, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        body: {
          title: 'Refresh Requests (Updated again)',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
