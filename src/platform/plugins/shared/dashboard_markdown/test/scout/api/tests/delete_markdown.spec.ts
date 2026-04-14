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
import { apiTest, COMMON_HEADERS, MARKDOWN_API_PATH } from '../fixtures';

const TEST_MARKDOWN_ID = 'test-delete-markdown';
const TEST_MARKDOWN_ID_IN_SPACE = 'test-delete-markdown-in-space';

apiTest.describe('markdown - delete', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;
  const spaceId = `markdown-delete-space-id`;

  apiTest.beforeAll(async ({ kbnClient, requestAuth, apiServices }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    await apiServices.spaces.create({ id: spaceId, name: spaceId });
    await kbnClient.savedObjects.create({
      type: 'markdown',
      id: TEST_MARKDOWN_ID,
      attributes: {
        title: 'Markdown to delete',
        content: '# Delete me',
      },
      overwrite: true,
    });

    await kbnClient.savedObjects.create({
      type: 'markdown',
      id: TEST_MARKDOWN_ID_IN_SPACE,
      attributes: {
        title: 'Markdown to delete in specific space',
        content: '# Delete me',
      },
      overwrite: true,
      space: spaceId,
    });
  });

  apiTest.afterAll(async ({ apiServices, kbnClient }) => {
    await apiServices.spaces.delete(spaceId);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should return 404 for a non-existent markdown library item', async ({ apiClient }) => {
    const response = await apiClient.delete(`${MARKDOWN_API_PATH}/non-existent-markdown`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should return 204 when a markdown library item is deleted', async ({ apiClient }) => {
    const response = await apiClient.delete(`${MARKDOWN_API_PATH}/${TEST_MARKDOWN_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(204);
  });

  apiTest('should return 204 when deleted in a specific space', async ({ apiClient }) => {
    const response = await apiClient.delete(
      `s/${spaceId}/${MARKDOWN_API_PATH}/${TEST_MARKDOWN_ID_IN_SPACE}`,
      {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(204);
  });

  apiTest(
    'authorization - returns error when user does not have permission to delete library item',
    async ({ apiClient }) => {
      const response = await apiClient.delete(`${MARKDOWN_API_PATH}/${TEST_MARKDOWN_ID}`, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
