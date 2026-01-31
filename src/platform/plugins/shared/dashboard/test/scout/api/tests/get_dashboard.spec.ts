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

apiTest.describe('dashboards - get', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
    await kbnClient.importExport.load(KBN_ARCHIVES.TAGS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should return 200 with an existing dashboard', async ({ apiClient }) => {
    const response = await apiClient.get(`${DASHBOARD_API_PATH}/${TEST_DASHBOARD_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(TEST_DASHBOARD_ID);
    expect(response.body.data.title).toBe('Requests');

    // Does not return unsupported options from the saved object
    expect(response.body.data.options).toBeUndefined();
    expect(response.body.data.refresh_interval?.display).toBeUndefined();
  });

  apiTest('should return 404 with a non-existing dashboard', async ({ apiClient }) => {
    const response = await apiClient.get(`${DASHBOARD_API_PATH}/does-not-exist`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
