/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { KBN_ARCHIVES, MANAGEMENT_API, DEFAULT_TYPES } = testData;

apiTest.describe('scroll_count - less than 10k objects', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    adminCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.SCROLL_COUNT);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.SCROLL_COUNT);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('returns the count for each included types', async ({ apiClient }) => {
    const response = await apiClient.post(MANAGEMENT_API.SCROLL_COUNT, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: { typesToInclude: DEFAULT_TYPES },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      dashboard: 2,
      'index-pattern': 1,
      search: 1,
      visualization: 2,
    });
  });

  apiTest('only returns count for types to include', async ({ apiClient }) => {
    const response = await apiClient.post(MANAGEMENT_API.SCROLL_COUNT, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: { typesToInclude: ['dashboard', 'search'] },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      dashboard: 2,
      search: 1,
    });
  });

  apiTest('filters on title when searchString is provided', async ({ apiClient }) => {
    const response = await apiClient.post(MANAGEMENT_API.SCROLL_COUNT, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: { typesToInclude: DEFAULT_TYPES, searchString: 'Amazing' },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      dashboard: 1,
      visualization: 1,
      'index-pattern': 0,
      search: 0,
    });
  });

  apiTest('includes all requested types even when none match the search', async ({ apiClient }) => {
    const response = await apiClient.post(MANAGEMENT_API.SCROLL_COUNT, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: {
        typesToInclude: ['dashboard', 'search', 'visualization'],
        searchString: 'nothing-will-match',
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      dashboard: 0,
      visualization: 0,
      search: 0,
    });
  });
});
