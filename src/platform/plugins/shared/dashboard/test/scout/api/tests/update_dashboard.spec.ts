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

const updatedDashboard = {
  title: 'Refresh Requests (Updated)',
  options: { useMargins: false },
  panels: [
    {
      type: 'visualization',
      grid: { x: 0, y: 0, w: 48, h: 60, i: '1' },
      uid: '1',
      version: '7.3.0',
    },
  ],
  timeRange: {
    from: 'Wed Sep 16 2015 22:52:17 GMT-0700',
    to: 'Fri Sep 18 2015 12:24:38 GMT-0700',
  },
  timeRestore: true,
  references: [
    {
      id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
      name: '1:panel_1',
      type: 'visualization',
    },
  ],
};

apiTest.describe('dashboards - update', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    // returns editor role in most deployment project and deployment types
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
    await kbnClient.importExport.load(KBN_ARCHIVES.TAGS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should return 200 with an updated dashboard', async ({ apiClient }) => {
    const response = await apiClient.put(`${DASHBOARD_API_PATH}/${TEST_DASHBOARD_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: updatedDashboard,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(TEST_DASHBOARD_ID);
    expect(response.body.type).toBe('dashboard');
    expect(response.body.data.title).toBe('Refresh Requests (Updated)');
  });

  apiTest('should return 404 when updating a non-existent dashboard', async ({ apiClient }) => {
    const response = await apiClient.put(`${DASHBOARD_API_PATH}/not-an-id`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'Some other dashboard (updated)',
      },
      responseType: 'json',
    });

    expect(response.body).toStrictEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'A dashboard with saved object ID not-an-id was not found.',
    });
  });

  apiTest('validation - returns error when object is not provided', async ({ apiClient }) => {
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
  });

  apiTest('validation - returns error if panels is not an array', async ({ apiClient }) => {
    const response = await apiClient.put(`${DASHBOARD_API_PATH}/${TEST_DASHBOARD_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'foo',
        panels: {},
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.panels]: expected value of type [array] but got [Object]'
    );
  });
});
