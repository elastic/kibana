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
import { COMMON_HEADERS, ES_ARCHIVE_BASIC_INDEX, configArray } from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `PUT ${config.path}/{id}/runtime_field - errors (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;
      let createdIds: string[] = [];

      apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

        await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
        log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);
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

      apiTest('returns 404 error on non-existing index_pattern', async ({ apiClient }) => {
        const nonExistentId = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

        const response = await apiClient.put(`${config.path}/${nonExistentId}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeBar',
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['field_name'].value)",
              },
            },
          },
        });

        expect(response.statusCode).toBe(404);
      });

      apiTest('returns error on non-runtime field update attempt', async ({ apiClient }) => {
        const title = `basic_index`;

        // Create a data view/index pattern without runtime fields
        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [config.serviceKey]: {
              title,
            },
          },
        });

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Attempt to PUT/update a field that is not a runtime field
        // 'bar' is a regular field from the basic_index, not a runtime field
        const putResponse = await apiClient.put(`${config.path}/${id}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'bar',
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['field_name'].value)",
              },
            },
          },
        });

        expect(putResponse.statusCode).toBe(400);
        expect(putResponse.body.message).toBe('Only runtime fields can be updated');
      });
    }
  );
});
