/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { COMMON_HEADERS, configArray } from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `POST ${config.path}/{id}/runtime_field - create errors (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;
      let createdIds: string[] = [];

      apiTest.beforeAll(async ({ requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
      });

      apiTest.afterEach(async ({ apiClient, log }) => {
        for (const id of createdIds) {
          try {
            await apiClient.delete(`${config.path}/${id}`, {
              headers: {
                ...COMMON_HEADERS,
                ...adminApiCredentials.apiKeyHeader,
              },
            });
            log.info(`Cleaned up ${config.serviceKey} with id: ${id}`);
          } catch {
            log.info(`Failed to clean up ${config.serviceKey} with id: ${id}`);
          }
        }
        createdIds = [];
      });

      apiTest('returns an error when field object is not provided', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create index pattern/data view
        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
            },
          },
        });

        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Try to create runtime field without providing required fields
        const response = await apiClient.post(`${config.path}/${id}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {},
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          '[request body.name]: expected value of type [string] but got [undefined]'
        );
      });

      apiTest('returns 404 for non-existent index pattern', async ({ apiClient }) => {
        const nonExistentId = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

        const response = await apiClient.post(`${config.path}/${nonExistentId}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeFoo',
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['foo'].value)",
              },
            },
          },
        });

        expect(response.statusCode).toBe(404);
      });

      apiTest('returns error when name is not provided', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create index pattern/data view
        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
            },
          },
        });

        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Try to create runtime field without name
        const response = await apiClient.post(`${config.path}/${id}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['foo'].value)",
              },
            },
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
      });

      apiTest('returns error when runtimeField is not provided', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create index pattern/data view
        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
            },
          },
        });

        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Try to create runtime field without runtimeField object
        const response = await apiClient.post(`${config.path}/${id}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeFoo',
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
      });

      apiTest('returns error for invalid runtime field type', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create index pattern/data view
        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
            },
          },
        });

        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Try to create runtime field with invalid type
        const response = await apiClient.post(`${config.path}/${id}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeFoo',
            runtimeField: {
              type: 'invalid_type',
              script: {
                source: "emit(doc['foo'].value)",
              },
            },
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
      });
    }
  );
});
