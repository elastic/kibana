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

const SEARCH_ENDPOINT = `${MARKDOWN_API_PATH}/search`;
const TOTAL_MARKDOWNS = 25;

apiTest.describe('markdown - search', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    await kbnClient.savedObjects.cleanStandardList();
    viewerCredentials = await requestAuth.getApiKey('viewer');
    const createPromises = Array.from({ length: TOTAL_MARKDOWNS }, (_, i) =>
      kbnClient.savedObjects.create({
        type: 'markdown',
        id: `test-search-markdown-${String(i).padStart(2, '0')}`,
        attributes: {
          title: `Search Markdown ${String(i).padStart(2, '0')}`,
          description: `Description for markdown ${i}`,
          content: `# Content ${i}`,
        },
        overwrite: true,
      })
    );
    await Promise.all(createPromises);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should retrieve a paginated list of markdown panels', async ({ apiClient }) => {
    const response = await apiClient.post(SEARCH_ENDPOINT, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      body: {},
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(TOTAL_MARKDOWNS);
    expect(response.body.markdowns.length).toBeGreaterThan(1);
  });

  apiTest('should narrow results by search', async ({ apiClient }) => {
    const response = await apiClient.post(SEARCH_ENDPOINT, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      body: {
        search: 'Search Markdown 00',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(1);
    expect(response.body.markdowns).toHaveLength(1);
  });

  apiTest('should allow users to set a per page limit', async ({ apiClient }) => {
    const response = await apiClient.post(SEARCH_ENDPOINT, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      body: {
        per_page: 5,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(TOTAL_MARKDOWNS);
    expect(response.body.markdowns).toHaveLength(5);
  });

  apiTest(
    'should allow users to paginate through the list of markdown panels',
    async ({ apiClient }) => {
      const response = await apiClient.post(SEARCH_ENDPOINT, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        body: {
          page: 2,
          per_page: 10,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(TOTAL_MARKDOWNS);
      expect(response.body.markdowns).toHaveLength(10);
      expect(response.body.markdowns[0].id).toBe(`test-search-markdown-10`);
    }
  );
});
