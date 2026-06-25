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
import { BASE_PATH, COMMON_HEADERS, ID_OVER_MAX_LENGTH } from '../fixtures/constants';

apiTest.describe('PUT /api/data_views/{id} - as code', { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let viewerApiCredentials: RoleApiCredentials;

  const createdIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKeyForAdmin();
    viewerApiCredentials = await requestAuth.getApiKeyForViewer();
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

  apiTest('creates a data view when the id does not exist', async ({ apiClient }) => {
    const id = `dv-put-create-${Date.now()}-${Math.random()}`;
    const indexPattern = `put-create-${Date.now()}-*`;
    const createdName = `Created with put ${Date.now()}-${Math.random()}`;

    const response = await apiClient.put(`${BASE_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        index_pattern: indexPattern,
        name: createdName,
      },
      responseType: 'json',
    });

    createdIds.push(id);

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBe(id);
    expect(response.body.data).toMatchObject({
      index_pattern: indexPattern,
      name: createdName,
    });
    expect(response.body.meta.version).toBeDefined();
  });

  apiTest(
    'updates an existing data view when the id exists',
    async ({ apiClient, apiServices }) => {
      const id = `dv-put-update-${Date.now()}-${Math.random()}`;
      const initialPattern = `put-update-initial-${Date.now()}-*`;
      const updatedPattern = `put-update-next-${Date.now()}-*`;
      const updatedName = 'Updated with put';
      const updatedFieldFilters = ['agent.*', 'host.ip'];

      await apiServices.dataViews.create({
        id,
        title: initialPattern,
      });
      createdIds.push(id);

      const response = await apiClient.put(`${BASE_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        body: {
          index_pattern: updatedPattern,
          name: updatedName,
          time_field: 'timestamp',
          allow_hidden_indices: true,
          field_filters: updatedFieldFilters,
          field_settings: {
            bytes_field: {
              popularity: 42,
              format: {
                type: 'bytes',
                params: {
                  pattern: '0,0.[000]b',
                },
              },
              custom_label: 'Bytes',
              custom_description: 'Payload size in bytes',
            },
            host_name: {
              popularity: 7,
              custom_label: 'Host',
              custom_description: 'Host name',
            },
          },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(id);
      expect(response.body.data).toMatchObject({
        index_pattern: updatedPattern,
        name: updatedName,
        time_field: 'timestamp',
        allow_hidden_indices: true,
        field_filters: updatedFieldFilters,
      });
      expect(response.body.data.field_settings).toMatchObject({
        bytes_field: {
          popularity: 42,
          format: {
            type: 'bytes',
            params: {
              pattern: '0,0.[000]b',
            },
          },
          custom_label: 'Bytes',
          custom_description: 'Payload size in bytes',
        },
        host_name: {
          popularity: 7,
          custom_label: 'Host',
          custom_description: 'Host name',
        },
      });
    }
  );

  apiTest('returns 400 when request body contains id', async ({ apiClient }) => {
    const id = `dv-put-body-id-${Date.now()}-${Math.random()}`;

    const response = await apiClient.put(`${BASE_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        id,
        index_pattern: 'put-body-id-*',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 400 when id is too long', async ({ apiClient }) => {
    const response = await apiClient.put(`${BASE_PATH}/${ID_OVER_MAX_LENGTH}`, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        index_pattern: 'put-id-too-long-*',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'returns 403 when user does not have indexPatterns manage privilege',
    async ({ apiClient }) => {
      const id = `dv-put-no-manage-${Date.now()}-${Math.random()}`;

      const response = await apiClient.put(`${BASE_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        body: {
          index_pattern: 'put-forbidden-*',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'returns 409 when creating via PUT with a duplicate name',
    async ({ apiClient, apiServices }) => {
      const sharedName = `Put Duplicate Name ${Date.now()}-${Math.random()}`;
      const existingId = `dv-put-409-name-existing-${Date.now()}-${Math.random()}`;
      const newId = `dv-put-409-name-new-${Date.now()}-${Math.random()}`;

      await apiServices.dataViews.create({
        id: existingId,
        title: `put-409-name-existing-${Date.now()}-*`,
        name: sharedName,
      });
      createdIds.push(existingId);

      const response = await apiClient.put(`${BASE_PATH}/${newId}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        body: {
          index_pattern: `put-409-name-new-${Date.now()}-*`,
          name: sharedName,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(409);
      expect(response.body.message).toContain('Duplicate data view');
      expect(response.body.message).toContain(sharedName);
    }
  );
});
