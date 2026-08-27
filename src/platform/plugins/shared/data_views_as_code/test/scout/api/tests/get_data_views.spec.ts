/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type KibanaRole, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { PAGINATION_DEFAULT_PER_PAGE, PAGINATION_MAX_SIZE } from '@kbn/as-code-shared-schemas';
import { BASE_PATH, COMMON_HEADERS } from '../fixtures/constants';

const INDEX_PATTERNS_READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: [],
      feature: { indexPatterns: ['read'] },
      spaces: ['*'],
    },
  ],
};

const buildUrl = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `${BASE_PATH}?${query}` : BASE_PATH;
};

apiTest.describe('GET /api/data_views/v2 - as code', { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let readOnlyApiCredentials: RoleApiCredentials;

  const runId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const uniquePrefix = `ScoutList${runId}`;
  const createdDataViews: Array<{
    id: string;
    name: string;
    title: string;
    timeFieldName?: string;
  }> = [];

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    adminApiCredentials = await requestAuth.getApiKeyForAdmin();
    readOnlyApiCredentials = await requestAuth.getApiKeyForCustomRole(INDEX_PATTERNS_READ_ROLE);

    const fixtures = [
      { suffix: 'Alpha', timeFieldName: 'timestamp' },
      { suffix: 'Beta' },
      { suffix: 'Gamma' },
      { suffix: 'Delta' },
      { suffix: 'Epsilon' },
    ];

    for (const { suffix, timeFieldName } of fixtures) {
      const name = `${uniquePrefix}${suffix}`;
      const title = `scout-list-${runId}-${suffix.toLowerCase()}-*`;
      const { data: dataView } = await apiServices.dataViews.create({
        id: `dv-list-${runId}-${suffix.toLowerCase()}`,
        title,
        name,
        timeFieldName,
      });

      createdDataViews.push({
        id: dataView.id,
        name,
        title,
        timeFieldName,
      });
    }
  });

  apiTest.afterAll(async ({ apiServices }) => {
    for (const { id } of createdDataViews) {
      try {
        await apiServices.dataViews.delete(id);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  apiTest('returns a paginated list of data views', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ query: `${uniquePrefix}*` }), {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(createdDataViews.length);
    expect(response.body.data).toHaveLength(createdDataViews.length);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.per_page).toBe(PAGINATION_DEFAULT_PER_PAGE);
  });

  apiTest(
    'allows users with indexPatterns read privilege to list data views',
    async ({ apiClient }) => {
      const response = await apiClient.get(buildUrl({ query: `${uniquePrefix}*` }), {
        headers: {
          ...COMMON_HEADERS,
          ...readOnlyApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.meta.total).toBe(createdDataViews.length);
      expect(response.body.data).toHaveLength(createdDataViews.length);
    }
  );

  apiTest('returns the as-code list item shape', async ({ apiClient }) => {
    const fixture = createdDataViews[0];
    const response = await apiClient.get(buildUrl({ query: `${fixture.name}*` }), {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: fixture.id,
      data: {
        name: fixture.name,
        index_pattern: fixture.title,
        time_field: fixture.timeFieldName,
      },
    });
    expect(response.body.data[0].meta.managed).toBe(false);
    expect(response.body.data[0].meta.version).toBeDefined();
    expect(response.body.data[0].meta.namespaces).toBeDefined();
  });

  apiTest('narrows results by query', async ({ apiClient }) => {
    const fixture = createdDataViews[0];
    const response = await apiClient.get(buildUrl({ query: `${fixture.name}*` }), {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(fixture.id);
    expect(response.body.data[0].data.name).toBe(fixture.name);
  });

  apiTest('allows users to set a per_page limit', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ query: `${uniquePrefix}*`, per_page: 2 }), {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(createdDataViews.length);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.per_page).toBe(2);
  });

  apiTest('allows users to paginate through results', async ({ apiClient }) => {
    const firstPage = await apiClient.get(
      buildUrl({ query: `${uniquePrefix}*`, per_page: 2, page: 1 }),
      {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(firstPage).toHaveStatusCode(200);
    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.meta.page).toBe(1);

    const secondPage = await apiClient.get(
      buildUrl({ query: `${uniquePrefix}*`, per_page: 2, page: 2 }),
      {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(secondPage).toHaveStatusCode(200);
    expect(secondPage.body.data).toHaveLength(2);
    expect(secondPage.body.meta.page).toBe(2);

    const thirdPage = await apiClient.get(
      buildUrl({ query: `${uniquePrefix}*`, per_page: 2, page: 3 }),
      {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(thirdPage).toHaveStatusCode(200);
    expect(thirdPage.body.data).toHaveLength(1);
    expect(thirdPage.body.meta.page).toBe(3);

    const allIds = [
      ...firstPage.body.data.map((item: { id: string }) => item.id),
      ...secondPage.body.data.map((item: { id: string }) => item.id),
      ...thirdPage.body.data.map((item: { id: string }) => item.id),
    ];
    expect(new Set(allIds).size).toBe(createdDataViews.length);
    expect(allIds.sort()).toStrictEqual(createdDataViews.map(({ id }) => id).sort());
  });

  apiTest('returns an empty list when no items match the query', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ query: 'nonexistentqueryxyzabc' }), {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(0);
    expect(response.body.data).toHaveLength(0);
  });

  apiTest('returns 400 when per_page exceeds the maximum', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ per_page: PAGINATION_MAX_SIZE + 1 }), {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 400 when page is less than 1', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ page: 0 }), {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });
});
