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
import {
  COMMON_HEADERS,
  ES_ARCHIVE_BASIC_INDEX,
  configArray,
  SERVICE_KEY_LEGACY,
} from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `GET ${config.path}/{id}/runtime_field/{name} - main (${config.name})`,
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

      apiTest('can fetch a runtime field', async ({ apiClient }) => {
        const title = `basic_index*`;

        // Create data view/index pattern with runtime fields
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
                runtimeFoo: {
                  type: 'keyword',
                  script: {
                    source: "emit(doc['field_name'].value)",
                  },
                },
                runtimeBar: {
                  type: 'keyword',
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

        // Get the runtime field
        const getResponse = await apiClient.get(`${config.path}/${id}/runtime_field/runtimeFoo`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey]).toBeDefined();

        // The response structure differs slightly between legacy and new API
        const field =
          config.serviceKey === SERVICE_KEY_LEGACY
            ? getResponse.body.field
            : getResponse.body.fields[0];

        expect(typeof field).toBe('object');
        expect(field.name).toBe('runtimeFoo');
        expect(field.type).toBe('string');
        expect(field.scripted).toBe(false);
        expect(field.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
      });
    }
  );
});
