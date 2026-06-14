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

const TEST_MARKDOWN_ID = 'test-update-markdown';
const TEST_MARKDOWN_ID_IN_SPACE = 'test-update-markdown-in-space';

apiTest.describe('markdown - upsert', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  const spaceId = `markdown-update-space-id`;

  apiTest.beforeAll(async ({ apiServices, kbnClient, requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await apiServices.spaces.create({ id: spaceId, name: spaceId });
    await kbnClient.savedObjects.create({
      type: 'markdown',
      id: TEST_MARKDOWN_ID,
      attributes: {
        title: 'Original Title',
        description: 'Original description',
        content: '# Original content',
      },
      overwrite: true,
    });

    await kbnClient.savedObjects.create({
      type: 'markdown',
      id: TEST_MARKDOWN_ID_IN_SPACE,
      attributes: {
        title: 'Original Title in Space',
        description: 'Original description in space',
        content: '# Original content in space',
      },
      overwrite: true,
      space: spaceId,
    });
  });

  apiTest.afterAll(async ({ apiServices, kbnClient }) => {
    await apiServices.spaces.delete(spaceId);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should update existing markdown library item', async ({ apiClient }) => {
    const response = await apiClient.put(`${MARKDOWN_API_PATH}/${TEST_MARKDOWN_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'Updated Title',
        content: '# Updated Content',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(TEST_MARKDOWN_ID);
    expect(response.body.data).toMatchObject({
      title: 'Updated Title',
      content: '# Updated Content',
    });
  });

  apiTest(
    'should update existing markdown library item in a specific space',
    async ({ apiClient }) => {
      const response = await apiClient.put(
        `s/${spaceId}/${MARKDOWN_API_PATH}/${TEST_MARKDOWN_ID_IN_SPACE}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...editorCredentials.apiKeyHeader,
          },
          body: {
            title: 'Updated Title in Space',
            content: '# Updated Content in space',
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(TEST_MARKDOWN_ID_IN_SPACE);
      expect(response.body.data).toMatchObject({
        title: 'Updated Title in Space',
        content: '# Updated Content in space',
      });
    }
  );

  apiTest('should create new markdown library item', async ({ apiClient }) => {
    const id = 'new-markdown';
    const response = await apiClient.put(`${MARKDOWN_API_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'New markdown',
        content: '# hello world',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBe(id);
    expect(response.body.data).toMatchObject({
      title: 'New markdown',
      content: '# hello world',
    });
  });

  apiTest('validation - returns error when content is not provided', async ({ apiClient }) => {
    const response = await apiClient.put(`${MARKDOWN_API_PATH}/${TEST_MARKDOWN_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'Title without content',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.content]: expected value of type [string] but got [undefined]'
    );
  });
});
