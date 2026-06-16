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

apiTest.describe('POST /api/data_views - as code', { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let readOnlyApiCredentials: RoleApiCredentials;

  // Track created data view IDs so we can clean them up
  const createdIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKeyForAdmin();
    readOnlyApiCredentials = await requestAuth.getApiKeyForCustomRole(INDEX_PATTERNS_READ_ROLE);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    for (const id of createdIds) {
      try {
        await apiServices.dataViews.delete(id);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  apiTest('can create a data view with index_pattern only', async ({ apiClient }) => {
    const uniqueId = `dv-create-basic-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        id: uniqueId,
        index_pattern: 'logs-*',
      },
      responseType: 'json',
    });

    createdIds.push(uniqueId);

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBe(uniqueId);
    expect(response.body.data).toMatchObject({
      index_pattern: 'logs-*',
    });
    expect(response.body.meta.managed).toBe(false);
    expect(response.body.meta.version).toBeDefined();
    expect(response.body.meta.namespaces).toBeDefined();
  });

  apiTest(
    'can create a data view with index_pattern, name, and time_field',
    async ({ apiClient }) => {
      const uniqueId = `dv-create-full-${Date.now()}-${Math.random()}`;

      const response = await apiClient.post(BASE_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        body: {
          id: uniqueId,
          index_pattern: 'metrics-*',
          name: 'My Metrics View',
          time_field: 'timestamp',
        },
        responseType: 'json',
      });

      createdIds.push(uniqueId);

      expect(response).toHaveStatusCode(201);
      expect(response.body.id).toBe(uniqueId);
      expect(response.body.data).toMatchObject({
        index_pattern: 'metrics-*',
        name: 'My Metrics View',
        time_field: 'timestamp',
      });
    }
  );

  apiTest('can create a data view without an explicit id', async ({ apiClient }) => {
    const response = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        index_pattern: 'events-*',
      },
      responseType: 'json',
    });

    // Track the auto-generated ID for cleanup
    createdIds.push(response.body.id);

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.data.index_pattern).toBe('events-*');
  });

  apiTest(
    'returns 403 when user has indexPatterns read privilege but not manage privilege',
    async ({ apiClient }) => {
      const response = await apiClient.post(BASE_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...readOnlyApiCredentials.apiKeyHeader,
        },
        body: {
          id: `dv-create-no-manage-${Date.now()}-${Math.random()}`,
          index_pattern: 'forbidden-*',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest('returns 400 when index_pattern is missing', async ({ apiClient }) => {
    const response = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        id: 'dv-missing-pattern',
        name: 'No Pattern',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 400 when body is empty', async ({ apiClient }) => {
    const response = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {},
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 400 when creating a data view with a duplicate id', async ({ apiClient }) => {
    const uniqueId = `dv-create-dup-id-${Date.now()}-${Math.random()}`;

    // Create the first data view
    const firstResponse = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        id: uniqueId,
        index_pattern: 'first-pattern-*',
      },
      responseType: 'json',
    });

    createdIds.push(uniqueId);
    expect(firstResponse).toHaveStatusCode(201);

    // Attempt to create another data view with the same id
    const duplicateResponse = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        id: uniqueId,
        index_pattern: 'second-pattern-*',
        name: 'Different Name',
      },
      responseType: 'json',
    });

    expect(duplicateResponse).toHaveStatusCode(400);
    expect(duplicateResponse.body.message).toContain(uniqueId);
    expect(duplicateResponse.body.message.toLowerCase()).toContain('conflict');
  });

  apiTest('returns 400 when creating a data view with a duplicate name', async ({ apiClient }) => {
    const sharedName = `Duplicate Name Test ${Date.now()}-${Math.random()}`;
    const firstId = `dv-create-dup-name-1-${Date.now()}-${Math.random()}`;
    const secondId = `dv-create-dup-name-2-${Date.now()}-${Math.random()}`;

    // Create the first data view with an explicit name
    const firstResponse = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        id: firstId,
        index_pattern: 'name-dup-first-*',
        name: sharedName,
      },
      responseType: 'json',
    });

    createdIds.push(firstId);
    expect(firstResponse).toHaveStatusCode(201);

    // Attempt to create a second data view with the same name but different id
    const duplicateResponse = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        id: secondId,
        index_pattern: 'name-dup-second-*',
        name: sharedName,
      },
      responseType: 'json',
    });

    // Track for cleanup in case it unexpectedly succeeds
    createdIds.push(secondId);

    expect(duplicateResponse).toHaveStatusCode(400);
    expect(duplicateResponse.body.message).toContain('Duplicate data view');
    expect(duplicateResponse.body.message).toContain(sharedName);
  });

  apiTest(
    'returns 400 when index_pattern collides with an existing unnamed data view',
    async ({ apiClient }) => {
      const sharedPattern = `collision-pattern-${Date.now()}-*`;
      const firstId = `dv-create-dup-pattern-1-${Date.now()}-${Math.random()}`;
      const secondId = `dv-create-dup-pattern-2-${Date.now()}-${Math.random()}`;

      // Create a data view without an explicit name (getName falls back to index_pattern)
      const firstResponse = await apiClient.post(BASE_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        body: {
          id: firstId,
          index_pattern: sharedPattern,
        },
        responseType: 'json',
      });

      createdIds.push(firstId);
      expect(firstResponse).toHaveStatusCode(201);

      // Attempt to create another data view with the same index_pattern and no name
      const duplicateResponse = await apiClient.post(BASE_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        body: {
          id: secondId,
          index_pattern: sharedPattern,
        },
        responseType: 'json',
      });

      // Track for cleanup in case it unexpectedly succeeds
      createdIds.push(secondId);

      expect(duplicateResponse).toHaveStatusCode(400);
      expect(duplicateResponse.body.message).toContain('Duplicate data view');
    }
  );
});
