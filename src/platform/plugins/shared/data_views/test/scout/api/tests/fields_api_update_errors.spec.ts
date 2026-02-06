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
    `POST ${config.path}/{id}/fields - errors (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;
      let createdIds: string[] = [];

      apiTest.beforeAll(async ({ requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
      });

      apiTest.afterEach(async ({ apiClient, log }) => {
        // Clean up any data views created during the test
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

      apiTest(`returns 404 error on non-existing ${config.serviceKey}`, async ({ apiClient }) => {
        const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
        const response = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            fields: {
              foo: {},
            },
          },
        });

        expect(response.statusCode).toBe(404);
      });

      apiTest('returns error when "fields" payload attribute is invalid', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create the data view / index pattern
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

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Try to update with invalid fields value
        const response = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            fields: 123,
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          '[request body.fields]: expected value of type [object] but got [number]'
        );
      });

      apiTest('returns error if no changes are specified', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create the data view / index pattern
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

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Try to update with empty field changes
        const response = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            fields: {
              foo: {},
              bar: {},
              baz: {},
            },
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe('Change set is empty.');
      });

      apiTest('returns validation error for too long customDescription', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create the data view / index pattern
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

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Try to update with too long customDescription
        const response = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            fields: {
              foo: {
                customDescription: 'too long value'.repeat(50),
              },
            },
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toContain('it must have a maximum length');
      });
    }
  );
});
