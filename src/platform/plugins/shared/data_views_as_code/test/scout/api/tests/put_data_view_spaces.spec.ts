/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apiTest,
  tags,
  type ApiClientFixture,
  type KibanaRole,
  type RoleApiCredentials,
} from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { BASE_PATH, COMMON_HEADERS } from '../fixtures/constants';

// Can manage data views in the default space only, so any other space is redacted as `?`.
const DEFAULT_SPACE_MANAGER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: [],
      feature: { indexPatterns: ['all'] },
      spaces: ['default'],
    },
  ],
};

apiTest.describe(
  'PUT /api/data_views/v2/{id} - as code - spaces',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let defaultSpaceManagerApiCredentials: RoleApiCredentials;

    const createdIds: string[] = [];
    const spaceId = `data-views-put-space-${Date.now()}`;
    const secondSpaceId = `data-views-put-space-2-${Date.now()}`;
    const thirdSpaceId = `data-views-put-space-3-${Date.now()}`;
    const allSpaceIds = [spaceId, secondSpaceId, thirdSpaceId];

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      for (const id of allSpaceIds) {
        await apiServices.spaces.create({ id, name: id });
      }
      adminApiCredentials = await requestAuth.getApiKeyForAdmin();
      defaultSpaceManagerApiCredentials = await requestAuth.getApiKeyForCustomRole(
        DEFAULT_SPACE_MANAGER_ROLE
      );
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const id of allSpaceIds) {
        await apiServices.spaces.delete(id);
      }
      for (const id of createdIds) {
        try {
          await apiServices.dataViews.delete(id);
        } catch {
          // ignore cleanup errors
        }
      }
    });

    apiTest(
      'creates a data view in the given spaces when the id does not exist',
      async ({ apiClient }) => {
        const id = `dv-put-spaces-${Date.now()}-${Math.random()}`;
        const indexPattern = `put-spaces-${Date.now()}-*`;

        const response = await apiClient.put(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          body: {
            index_pattern: indexPattern,
            spaces: ['default', spaceId],
          },
          responseType: 'json',
        });

        createdIds.push(id);

        expect(response).toHaveStatusCode(201);
        expect(response.body.id).toBe(id);
        expect(response.body.meta.spaces).toStrictEqual(
          expect.arrayContaining(['default', spaceId])
        );
        expect(response.body.meta.spaces).toHaveLength(2);

        const spaceResponse = await apiClient.get(`s/${spaceId}${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(spaceResponse).toHaveStatusCode(200);
        expect(spaceResponse.body.data.index_pattern).toBe(indexPattern);
      }
    );

    apiTest('returns 400 when spaces contains an empty id', async ({ apiClient }) => {
      const response = await apiClient.put(`${BASE_PATH}/dv-put-bad-spaces-${Date.now()}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        body: {
          index_pattern: `put-bad-spaces-${Date.now()}-*`,
          spaces: [''],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    const createSharedDataView = async (apiClient: ApiClientFixture, spaces: string[]) => {
      const id = `dv-put-spaces-update-${Date.now()}-${Math.random()}`;
      const response = await apiClient.put(`${BASE_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        body: {
          index_pattern: `put-spaces-update-${Date.now()}-*`,
          spaces,
        },
        responseType: 'json',
      });
      createdIds.push(id);
      expect(response).toHaveStatusCode(201);
      return id;
    };

    apiTest(
      'without spaces in the body, updates the data view and leaves it only in the url space',
      async ({ apiClient }) => {
        const id = await createSharedDataView(apiClient, ['default', spaceId]);
        const updatedPattern = `put-spaces-updated-${Date.now()}-*`;

        const response = await apiClient.put(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          body: { index_pattern: updatedPattern },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.index_pattern).toBe(updatedPattern);
        expect(response.body.meta.spaces).toStrictEqual(['default']);

        const removedSpaceResponse = await apiClient.get(`s/${spaceId}${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(removedSpaceResponse).toHaveStatusCode(404);
      }
    );

    apiTest(
      'without spaces in the body, updates the data view when it is already only in the url space',
      async ({ apiClient }) => {
        const id = await createSharedDataView(apiClient, ['default']);
        const updatedPattern = `put-spaces-same-${Date.now()}-*`;

        const response = await apiClient.put(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          body: { index_pattern: updatedPattern },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.index_pattern).toBe(updatedPattern);
        expect(response.body.meta.spaces).toStrictEqual(['default']);
      }
    );

    apiTest(
      'without spaces in the body, returns 403 when the data view is in a space the user cannot access',
      async ({ apiClient }) => {
        const id = await createSharedDataView(apiClient, ['default', spaceId]);
        const originalPattern = (
          await apiClient.get(`${BASE_PATH}/${id}`, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          })
        ).body.data.index_pattern;

        const response = await apiClient.put(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...defaultSpaceManagerApiCredentials.apiKeyHeader,
          },
          body: { index_pattern: `put-spaces-forbidden-${Date.now()}-*` },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);

        const unchangedResponse = await apiClient.get(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(unchangedResponse.body.data.index_pattern).toBe(originalPattern);
        expect(unchangedResponse.body.meta.spaces).toStrictEqual(
          expect.arrayContaining(['default', spaceId])
        );
      }
    );

    apiTest(
      'with many spaces in the body, adds and removes spaces to match them',
      async ({ apiClient }) => {
        const id = await createSharedDataView(apiClient, ['default', spaceId]);
        const updatedPattern = `put-many-spaces-updated-${Date.now()}-*`;

        const response = await apiClient.put(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          body: {
            index_pattern: updatedPattern,
            spaces: ['default', secondSpaceId, thirdSpaceId],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.index_pattern).toBe(updatedPattern);
        expect([...response.body.meta.spaces].sort()).toStrictEqual(
          ['default', secondSpaceId, thirdSpaceId].sort()
        );

        for (const addedSpaceId of [secondSpaceId, thirdSpaceId]) {
          const addedSpaceResponse = await apiClient.get(`s/${addedSpaceId}${BASE_PATH}/${id}`, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          });
          expect(addedSpaceResponse).toHaveStatusCode(200);
        }

        const removedSpaceResponse = await apiClient.get(`s/${spaceId}${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });
        expect(removedSpaceResponse).toHaveStatusCode(404);
      }
    );

    apiTest(
      'with many spaces in the body, updates the data view when they already match its spaces',
      async ({ apiClient }) => {
        const id = await createSharedDataView(apiClient, ['default', spaceId, secondSpaceId]);
        const updatedPattern = `put-many-spaces-same-${Date.now()}-*`;

        const response = await apiClient.put(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          // Same spaces in a different order
          body: {
            index_pattern: updatedPattern,
            spaces: [secondSpaceId, 'default', spaceId],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.index_pattern).toBe(updatedPattern);
        expect([...response.body.meta.spaces].sort()).toStrictEqual(
          ['default', spaceId, secondSpaceId].sort()
        );
      }
    );

    apiTest(
      'with many spaces in the body, returns 403 when the data view is in a space the user cannot access',
      async ({ apiClient }) => {
        const id = await createSharedDataView(apiClient, ['default', spaceId, secondSpaceId]);
        const originalPattern = (
          await apiClient.get(`${BASE_PATH}/${id}`, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          })
        ).body.data.index_pattern;

        const response = await apiClient.put(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...defaultSpaceManagerApiCredentials.apiKeyHeader,
          },
          body: {
            index_pattern: `put-many-spaces-forbidden-${Date.now()}-*`,
            spaces: ['default', spaceId, secondSpaceId, thirdSpaceId],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);

        const unchangedResponse = await apiClient.get(`${BASE_PATH}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(unchangedResponse.body.data.index_pattern).toBe(originalPattern);
        expect([...unchangedResponse.body.meta.spaces].sort()).toStrictEqual(
          ['default', spaceId, secondSpaceId].sort()
        );
      }
    );
  }
);
