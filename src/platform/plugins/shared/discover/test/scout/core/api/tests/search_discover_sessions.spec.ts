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
  DEV_TOOLS_READ_ROLE,
  DISCOVER_SESSION_API_BASE_PATH,
  KBN_ARCHIVES,
  TEST_DISCOVER_SESSION_ID,
} from '../fixtures/constants';

const buildUrl = (params: Record<string, string | number>) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  return `${DISCOVER_SESSION_API_BASE_PATH}?${searchParams.toString()}`;
};

apiTest.describe('GET /api/discover_sessions', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;
  let devToolsReaderCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    devToolsReaderCredentials = await requestAuth.getApiKeyForCustomRole(DEV_TOOLS_READ_ROLE);
    await kbnClient.importExport.load(KBN_ARCHIVES.SESSION_WITH_CONTROL);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search'] });
  });

  apiTest('returns paginated Discover session summaries', async ({ apiClient }) => {
    const response = await apiClient.get(
      buildUrl({ query: 'ESQL control unlink test', page: 1, per_page: 1 }),
      {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta).toStrictEqual({
      total: 1,
      page: 1,
      per_page: 1,
    });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(TEST_DISCOVER_SESSION_ID);

    for (const session of response.body.data) {
      expect(Object.keys(session.data).sort()).toStrictEqual(['description', 'title']);
      expect(session.id).toBeDefined();
      expect(session.meta.managed).toBe(false);
      expect(session.meta.version).toBeDefined();
    }
  });

  apiTest('paginates beyond the first page', async ({ apiClient }) => {
    const response = await apiClient.get(
      buildUrl({ query: 'ESQL control unlink test', page: 2, per_page: 1 }),
      {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta).toStrictEqual({
      total: 1,
      page: 2,
      per_page: 1,
    });
    expect(response.body.data).toHaveLength(0);
  });

  apiTest(
    'applies default pagination when page and per_page are omitted',
    async ({ apiClient }) => {
      const response = await apiClient.get(buildUrl({ query: 'ESQL' }), {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.meta).toStrictEqual({
        total: 1,
        page: 1,
        per_page: 20,
      });
      expect(response.body.data).toHaveLength(1);
    }
  );

  apiTest('returns no results when the query matches nothing', async ({ apiClient }) => {
    const response = await apiClient.get(buildUrl({ query: 'zzznonexistentterm' }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.meta.total).toBe(0);
    expect(response.body.data).toHaveLength(0);
  });

  apiTest('requires all query terms to match (AND operator)', async ({ apiClient }) => {
    const matchingResponse = await apiClient.get(buildUrl({ query: 'ESQL control' }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(matchingResponse).toHaveStatusCode(200);
    expect(matchingResponse.body.data).toHaveLength(1);
    expect(matchingResponse.body.data[0].id).toBe(TEST_DISCOVER_SESSION_ID);

    const partialResponse = await apiClient.get(buildUrl({ query: 'ESQL zzznonexistentterm' }), {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(partialResponse).toHaveStatusCode(200);
    expect(partialResponse.body.data).toHaveLength(0);
  });

  apiTest('rejects per page limits above the maximum', async ({ apiClient }) => {
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
    'returns an empty result set when the user cannot read Discover sessions',
    async ({ apiClient }) => {
      // Unlike GET /{id}, find does not 403 for under-privileged users: it filters out
      // unauthorized types and returns an empty response.
      const response = await apiClient.get(buildUrl({ query: 'ESQL' }), {
        headers: {
          ...COMMON_HEADERS,
          ...devToolsReaderCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.data).toHaveLength(0);
    }
  );
});
