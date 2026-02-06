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
    `DELETE ${config.path}/{id}/runtime_field/{name} - main (${config.name})`,
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

      apiTest('can delete a runtime field', async ({ apiClient }) => {
        const title = `basic_index*`;

        // Create data view/index pattern with a runtime field
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
              runtimeFieldMap: {
                runtimeBar: {
                  type: 'long',
                  script: {
                    source: "emit(doc['field_name'].value)",
                  },
                },
              },
            },
          },
        });

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Verify the runtime field exists in the data view/index pattern
        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(typeof getResponse.body[config.serviceKey].fields.runtimeBar).toBe('object');

        // Delete the runtime field
        const deleteResponse = await apiClient.delete(
          `${config.path}/${id}/runtime_field/runtimeBar`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          }
        );

        expect(deleteResponse.statusCode).toBe(200);

        // Verify the runtime field has been deleted
        const verifyResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(verifyResponse.statusCode).toBe(200);
        expect(typeof verifyResponse.body[config.serviceKey].fields.runtimeBar).toBe('undefined');
      });
    }
  );
});
