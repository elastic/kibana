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

apiTest.describe('markdown - create', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;
  const spaceId = `markdown-create-space-id`;

  apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
    await apiServices.spaces.create({ id: spaceId, name: spaceId });
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
  });

  apiTest.afterAll(async ({ kbnClient, apiServices }) => {
    await apiServices.spaces.delete(spaceId);
    await kbnClient.savedObjects.clean({ types: ['markdown'] });
  });

  apiTest('should create a markdown library item', async ({ apiClient }) => {
    const content = '# Hello world';
    const title = `Test title ${Date.now()}`;
    const response = await apiClient.post(MARKDOWN_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        content,
        description: 'some description',
        title,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.data).toMatchObject({
      content,
      description: 'some description',
      title,
    });
  });

  apiTest('should create a markdown library item in a specific space', async ({ apiClient }) => {
    const content = '# Space-scoped markdown';
    const title = `Space-scoped markdown ${Date.now()}`;
    const response = await apiClient.post(`s/${spaceId}/${MARKDOWN_API_PATH}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        content,
        title,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.data).toMatchObject({ content, title });
  });

  apiTest(
    'markdown created in a space should not be accessible from the default space',
    async ({ apiClient }) => {
      const content = `Isolated content`;
      const title = 'Isolated markdown library item';

      const createResponse = await apiClient.post(`s/${spaceId}/${MARKDOWN_API_PATH}`, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        body: {
          content,
          title,
        },
        responseType: 'json',
      });

      expect(createResponse).toHaveStatusCode(201);

      const getResponse = await apiClient.get(`${MARKDOWN_API_PATH}/${createResponse.body.id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(404);
    }
  );

  apiTest('validation - returns error when content is not provided', async ({ apiClient }) => {
    const response = await apiClient.post(MARKDOWN_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'Missing content',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.content]: expected value of type [string] but got [undefined]'
    );
  });

  apiTest('validation - returns error when title is not provided', async ({ apiClient }) => {
    const response = await apiClient.post(MARKDOWN_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        content: '## Heading\n\nSome **bold** text',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.title]: expected value of type [string] but got [undefined]'
    );
  });

  apiTest(
    'validation - returns error when unknown attributes are provided',
    async ({ apiClient }) => {
      const response = await apiClient.post(MARKDOWN_API_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        body: {
          content: '# Test',
          unknownField: 'should not be accepted',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'authorization - returns error when user does not have permission to create library item',
    async ({ apiClient }) => {
      const response = await apiClient.post(MARKDOWN_API_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        body: {
          content: '# Test',
          title: 'Test title',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBe('Unable to create markdown');
    }
  );
});
