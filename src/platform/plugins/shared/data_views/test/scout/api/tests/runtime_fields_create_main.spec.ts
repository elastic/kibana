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
    `POST ${config.path}/{id}/runtime_field - create main (${config.name})`,
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

      apiTest('can create a new runtime field', async ({ apiClient }) => {
        const title = `basic_index*`;

        // Create index pattern/data view
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

        // Create runtime field
        const runtimeFieldResponse = await apiClient.post(`${config.path}/${id}/runtime_field`, {
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

        expect(runtimeFieldResponse.statusCode).toBe(200);
        expect(runtimeFieldResponse.body[config.serviceKey]).toBeDefined();

        // Verify the response contains the runtime field info
        const field =
          config.serviceKey === 'index_pattern'
            ? runtimeFieldResponse.body.field
            : runtimeFieldResponse.body.fields[0];

        expect(field.name).toBe('runtimeBar');
        expect(field.runtimeField.type).toBe('long');
        expect(field.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
        expect(field.scripted).toBe(false);
      });

      apiTest(
        'newly created runtime field is available in the index_pattern object',
        async ({ apiClient }) => {
          const title = `basic_index`;

          // Create index pattern/data view
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

          const id = createResponse.body[config.serviceKey].id;
          createdIds.push(id);

          // Create runtime field
          await apiClient.post(`${config.path}/${id}/runtime_field`, {
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

          // GET the index pattern and verify runtime field is in fields
          const getResponse = await apiClient.get(`${config.path}/${id}`, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          });

          expect(getResponse.statusCode).toBe(200);
          expect(getResponse.body[config.serviceKey]).toBeDefined();

          const field = getResponse.body[config.serviceKey].fields.runtimeBar;

          expect(field.name).toBe('runtimeBar');
          expect(field.runtimeField.type).toBe('long');
          expect(field.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
          expect(field.scripted).toBe(false);

          // Verify that creating the same runtime field again returns 400
          const duplicateResponse = await apiClient.post(`${config.path}/${id}/runtime_field`, {
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

          expect(duplicateResponse.statusCode).toBe(400);
        }
      );

      apiTest('prevents field name collisions', async ({ apiClient }) => {
        const title = `basic*`;

        // Create index pattern/data view
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

        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Create first runtime field
        const response2 = await apiClient.post(`${config.path}/${id}/runtime_field`, {
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

        expect(response2.statusCode).toBe(200);

        // Try to create the same runtime field again (should fail)
        const response3 = await apiClient.post(`${config.path}/${id}/runtime_field`, {
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

        expect(response3.statusCode).toBe(400);

        // Create composite runtime field
        const response4 = await apiClient.post(`${config.path}/${id}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeComposite',
            runtimeField: {
              type: 'composite',
              script: {
                source: 'emit("a","a"); emit("b","b")',
              },
              fields: {
                a: {
                  type: 'keyword',
                },
                b: {
                  type: 'keyword',
                },
              },
            },
          },
        });

        expect(response4.statusCode).toBe(200);

        // Try to create the same composite runtime field again (should fail)
        const response5 = await apiClient.post(`${config.path}/${id}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeComposite',
            runtimeField: {
              type: 'composite',
              script: {
                source: 'emit("a","a"); emit("b","b")',
              },
              fields: {
                a: {
                  type: 'keyword',
                },
                b: {
                  type: 'keyword',
                },
              },
            },
          },
        });

        expect(response5.statusCode).toBe(400);
      });
    }
  );
});
