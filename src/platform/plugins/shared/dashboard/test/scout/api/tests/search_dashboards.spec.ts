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
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH, KBN_ARCHIVES } from '../fixtures';

const buildUrl = (params: Record<string, string | string[] | number | undefined>) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, String(item));
        }
      } else {
        searchParams.set(key, String(value));
      }
    }
  }
  const query = searchParams.toString();
  return query ? `${DASHBOARD_API_PATH}?${query}` : DASHBOARD_API_PATH;
};

apiTest.describe('dashboards - search', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;

  // The `asCode.useGASchemas` flag defaults to `true`, so this suite exercises the GA schemas
  // without an explicit override.
  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.importExport.load(KBN_ARCHIVES.MANY_DASHBOARDS);
    await kbnClient.importExport.load(KBN_ARCHIVES.TAGS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should retrieve a paginated list of dashboards', async ({ apiClient }) => {
    const response = await apiClient.get(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(101);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.per_page).toBe(20);
    expect(response.body.data).toHaveLength(20);
    expect(response.body.data[0].id).toBe('test-dashboard-00');
  });

  apiTest('should narrow results by query', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ query: '0*' }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.per_page).toBe(20);
    expect(response.body.data).toHaveLength(1);
  });

  apiTest('should allow users to set a per page limit', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ per_page: 10 }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(101);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.per_page).toBe(10);
    expect(response.body.data).toHaveLength(10);
  });

  apiTest('should reject per page limits above the GA maximum', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ per_page: 1001 }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'should allow users to paginate through the list of dashboards',
    async ({ apiClient }) => {
      const response = await apiClient.get(buildUrl({ page: 5, per_page: 10 }), {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.meta.total).toBe(101);
      expect(response.body.meta.page).toBe(5);
      expect(response.body.meta.per_page).toBe(10);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.data[0].id).toBe('test-dashboard-40');
    }
  );

  apiTest('should narrow results by tags', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ tags: 'tag-2' }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.per_page).toBe(20);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('8d66658a-f5b7-4482-84dc-f41d317473b8');
    expect(response.body.data[0].data.tags).toStrictEqual(['tag-2', 'tag-3']);
  });

  apiTest('should narrow results by tags with multiple values', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ tags: ['tag-1', 'tag-2'], query: 'tagged*' }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.per_page).toBe(20);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('8d66658a-f5b7-4482-84dc-f41d317473b8');
  });

  apiTest('should narrow results by excluded_tags', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ excluded_tags: 'tag-2' }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(100);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.per_page).toBe(20);
    expect(response.body.data).toHaveLength(20);
    expect(response.body.data.map((dashboard: { id: string }) => dashboard.id)).not.toContain(
      '8d66658a-f5b7-4482-84dc-f41d317473b8'
    );
  });

  apiTest('should narrow results by excluded_tags with multiple values', async ({ apiClient }) => {
    const response = await apiClient.get(
      buildUrl({ excluded_tags: ['tag-1', 'tag-2'], query: 'tagged*' }),
      {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(0);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.per_page).toBe(20);
    expect(response.body.data).toHaveLength(0);
  });

  apiTest('should narrow results by tag_names (single name)', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ tag_names: 'bar' }), {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('8d66658a-f5b7-4482-84dc-f41d317473b8');
  });

  apiTest('should narrow results by tag_names with multiple names (OR)', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ tag_names: ['bar', 'buzz'] }), {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('8d66658a-f5b7-4482-84dc-f41d317473b8');
  });

  apiTest('should return empty results when tag_names matches no tag', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ tag_names: 'does-not-exist' }), {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(0);
    expect(response.body.data).toHaveLength(0);
  });

  apiTest(
    'should return empty results when tag_names matches a tag with no dashboards',
    async ({ apiClient }) => {
      const response = await apiClient.get(buildUrl({ tag_names: 'foo' }), {
        headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.data).toHaveLength(0);
    }
  );

  apiTest('should combine tags and tag_names with OR semantics', async ({ apiClient }) => {
    // tag-1 (foo) is referenced by no dashboard; tag_names=buzz resolves to tag-3, which only
    // dashboard ...473b8 references. OR returns that dashboard; AND would return nothing (the
    // dashboard does not reference tag-1). Asserting total=1 pins the behaviour to OR.
    const response = await apiClient.get(buildUrl({ tags: 'tag-1', tag_names: 'buzz' }), {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('8d66658a-f5b7-4482-84dc-f41d317473b8');
  });

  apiTest('should exclude results by excluded_tag_names (single name)', async ({ apiClient }) => {
    const response = await apiClient.get(
      buildUrl({ query: 'tagged*', excluded_tag_names: 'bar' }),
      { headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader }, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(0);
  });

  apiTest(
    'should not exclude results when excluded_tag_names matches no tag',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        buildUrl({ query: 'tagged*', excluded_tag_names: 'does-not-exist' }),
        { headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.meta.total).toBe(1);
    }
  );

  apiTest(
    'should exclude results by excluded_tag_names with multiple names',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        buildUrl({ query: 'tagged*', excluded_tag_names: ['bar', 'buzz'] }),
        { headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.data).toHaveLength(0);
    }
  );
});
