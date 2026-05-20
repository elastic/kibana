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

const TEST_MARKDOWN_ID = 'test-get-markdown';
const TEST_MARKDOWN_ID_IN_SPACE = 'test-get-markdown-in-space';

apiTest.describe('markdown - get', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;
  const spaceId = `markdown-get-space-id`;

  apiTest.beforeAll(async ({ apiServices, kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    await apiServices.spaces.create({ id: spaceId, name: spaceId });
    await kbnClient.savedObjects.create({
      type: 'markdown',
      id: TEST_MARKDOWN_ID,
      attributes: {
        title: 'Test Markdown',
        description: 'A test markdown panel',
        content: '# Test Content',
      },
      overwrite: true,
    });

    await kbnClient.savedObjects.create({
      type: 'markdown',
      id: TEST_MARKDOWN_ID_IN_SPACE,
      attributes: {
        title: 'Test Markdown in specific space',
        description: 'A test markdown panel in specific space',
        content: '# Test Content in specific space',
      },
      overwrite: true,
      space: spaceId,
    });
  });

  apiTest.afterAll(async ({ apiServices, kbnClient }) => {
    await apiServices.spaces.delete(spaceId);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should return 200 with an existing markdown library item', async ({ apiClient }) => {
    const response = await apiClient.get(`${MARKDOWN_API_PATH}/${TEST_MARKDOWN_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(TEST_MARKDOWN_ID);
    expect(response.body.data).toMatchObject({
      title: 'Test Markdown',
      description: 'A test markdown panel',
      content: '# Test Content',
    });
  });

  apiTest(
    'should return 200 with an existing markdown library in a specific space',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        `s/${spaceId}/${MARKDOWN_API_PATH}/${TEST_MARKDOWN_ID_IN_SPACE}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...viewerCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(TEST_MARKDOWN_ID_IN_SPACE);
      expect(response.body.data).toMatchObject({
        title: 'Test Markdown in specific space',
        description: 'A test markdown panel in specific space',
        content: '# Test Content in specific space',
      });
    }
  );

  apiTest('should return 404 with a non-existing markdown library item', async ({ apiClient }) => {
    const response = await apiClient.get(`${MARKDOWN_API_PATH}/does-not-exist`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
