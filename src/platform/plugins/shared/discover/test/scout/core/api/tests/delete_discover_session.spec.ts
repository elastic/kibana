/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  COMMON_HEADERS,
  DISCOVER_SESSION_API_BASE_PATH,
  KBN_ARCHIVES,
  TEST_DISCOVER_SESSION_ID,
} from '../fixtures/constants';

apiTest.describe('DELETE /api/discover_sessions/{id}', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.importExport.load(KBN_ARCHIVES.SESSION_WITH_CONTROL);
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search'] });
  });

  apiTest('deletes an existing Discover session', async ({ apiClient }) => {
    const response = await apiClient.delete(
      `${DISCOVER_SESSION_API_BASE_PATH}/${TEST_DISCOVER_SESSION_ID}`,
      {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(204);

    const getResponse = await apiClient.get(
      `${DISCOVER_SESSION_API_BASE_PATH}/${TEST_DISCOVER_SESSION_ID}`,
      {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(getResponse).toHaveStatusCode(404);
  });

  apiTest('returns 404 when the Discover session does not exist', async ({ apiClient }) => {
    const response = await apiClient.delete(`${DISCOVER_SESSION_API_BASE_PATH}/does-not-exist`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.message).toBe(
      'A Discover session with ID [does-not-exist] was not found.'
    );
  });

  apiTest('returns 403 when the user cannot delete Discover sessions', async ({ apiClient }) => {
    const response = await apiClient.delete(
      `${DISCOVER_SESSION_API_BASE_PATH}/${TEST_DISCOVER_SESSION_ID}`,
      {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(403);
  });
});
