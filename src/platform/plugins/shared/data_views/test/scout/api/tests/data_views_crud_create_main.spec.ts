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
import { COMMON_HEADERS, ES_ARCHIVE_BASIC_INDEX, configArray } from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `POST ${config.path} - main (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;
      // Track created data view IDs for cleanup
      let createdIds: string[] = [];

      apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
        // Admin role required for creating data views and managing spaces
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

        // Load ES archive for tests that need basic_index
        await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
        log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);
      });

      apiTest.afterEach(async ({ apiClient, log }) => {
        // Cleanup: delete all data views created during the test
        for (const id of createdIds) {
          try {
            await apiClient.delete(`${config.path}/${id}`, {
              headers: {
                ...COMMON_HEADERS,
                ...adminApiCredentials.apiKeyHeader,
              },
            });
            log.debug(`Cleaned up ${config.serviceKey} with id: ${id}`);
          } catch (e) {
            log.debug(
              `Failed to clean up ${config.serviceKey} with id: ${id}: ${(e as Error).message}`
            );
          }
        }
        createdIds = [];
      });

      apiTest('can create an index_pattern with just a title', async ({ apiClient, log }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        log.info(`Testing endpoint: ${config.path}`);
        log.info(`Service key: ${config.serviceKey}`);
        log.info(`Title: ${title}`);

        const response = await apiClient.post(config.path, {
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

        log.info(`Response status: ${response.statusCode}`);
        log.info(`Response body: ${JSON.stringify(response.body, null, 2)}`);

        expect(response.statusCode).toBe(200);
        // Track created ID for cleanup - always present on successful creation
        createdIds.push(response.body[config.serviceKey].id);
      });

      apiTest('returns back the created index_pattern object', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(config.path, {
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

        expect(typeof response.body[config.serviceKey]).toBe('object');
        expect(response.body[config.serviceKey].title).toBe(title);
        expect(typeof response.body[config.serviceKey].id).toBe('string');
        expect(response.body[config.serviceKey].id.length).toBeGreaterThan(0);
        createdIds.push(response.body[config.serviceKey].id);
      });

      apiTest(
        'can specify primitive optional attributes when creating an index pattern',
        async ({ apiClient }) => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const id = `test-id-${Date.now()}-${Math.random()}*`;
          const response = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              [config.serviceKey]: {
                title,
                id,
                type: 'test-type',
                timeFieldName: 'test-timeFieldName',
              },
            },
          });

          expect(response.statusCode).toBe(200);
          expect(response.body[config.serviceKey].title).toBe(title);
          expect(response.body[config.serviceKey].id).toBe(id);
          expect(response.body[config.serviceKey].type).toBe('test-type');
          expect(response.body[config.serviceKey].timeFieldName).toBe('test-timeFieldName');
          createdIds.push(response.body[config.serviceKey].id);
        }
      );

      apiTest(
        'can specify optional sourceFilters attribute when creating an index pattern',
        async ({ apiClient }) => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              [config.serviceKey]: {
                title,
                sourceFilters: [
                  {
                    value: 'foo',
                  },
                ],
              },
            },
          });

          expect(response.statusCode).toBe(200);
          expect(response.body[config.serviceKey].title).toBe(title);
          expect(response.body[config.serviceKey].sourceFilters[0].value).toBe('foo');
          createdIds.push(response.body[config.serviceKey].id);
        }
      );

      apiTest(
        'can specify optional fieldFormats attribute when creating an index pattern',
        async ({ apiClient }) => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              [config.serviceKey]: {
                title,
                fieldFormats: {
                  foo: {
                    id: 'test-id',
                    params: {},
                  },
                },
              },
            },
          });

          expect(response.statusCode).toBe(200);
          expect(response.body[config.serviceKey].fieldFormats.foo.id).toBe('test-id');
          expect(response.body[config.serviceKey].fieldFormats.foo.params).toStrictEqual({});
          createdIds.push(response.body[config.serviceKey].id);
        }
      );

      apiTest('can create index pattern with empty title', async ({ apiClient }) => {
        const response = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title: '',
              allowNoIndex: true,
            },
          },
        });

        expect(response.statusCode).toBe(200);
        // Track created ID for cleanup - always present on successful creation
        createdIds.push(response.body[config.serviceKey].id);
      });

      apiTest(
        'can specify optional fields attribute when creating an index pattern',
        async ({ apiClient }) => {
          const title = `basic_index*`;
          const response = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              override: true,
              [config.serviceKey]: {
                title,
                fields: {
                  foo: {
                    name: 'foo',
                    // Scripted fields code dropped since they are not supported in Serverless
                    customLabel: 'Custom Label',
                  },
                },
              },
            },
          });

          expect(response.statusCode).toBe(200);
          expect(response.body[config.serviceKey].title).toBe(title);
          expect(response.body[config.serviceKey].fields.foo.name).toBe('foo');
          expect(response.body[config.serviceKey].fields.foo.customLabel).toBe('Custom Label');
          expect(response.body[config.serviceKey].fields.bar.name).toBe('bar'); // created from es index
          expect(response.body[config.serviceKey].fields.bar.type).toBe('boolean');
          createdIds.push(response.body[config.serviceKey].id);
        }
      );

      apiTest('can add fields created from es index', async ({ apiClient }) => {
        const title = `basic_index*`;
        const response = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [config.serviceKey]: {
              title,
              fields: {
                foo: {
                  name: 'foo',
                  type: 'string',
                },
                fake: {
                  name: 'fake',
                  type: 'string',
                },
              },
            },
          },
        });

        expect(response.statusCode).toBe(200);
        expect(response.body[config.serviceKey].title).toBe(title);
        expect(response.body[config.serviceKey].fields.foo.name).toBe('foo');
        expect(response.body[config.serviceKey].fields.foo.type).toBe('number'); // picked up from index
        expect(response.body[config.serviceKey].fields.fake).toBeUndefined(); // not in index, so not created
        createdIds.push(response.body[config.serviceKey].id);
      });

      apiTest('can add runtime fields', async ({ apiClient }) => {
        const title = `basic_index*`;
        const response = await apiClient.post(config.path, {
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
                    source: 'emit(doc["foo"].value)',
                  },
                },
              },
            },
          },
        });

        expect(response.statusCode).toBe(200);
        expect(response.body[config.serviceKey].title).toBe(title);
        expect(response.body[config.serviceKey].runtimeFieldMap.runtimeFoo.type).toBe('keyword');
        expect(response.body[config.serviceKey].runtimeFieldMap.runtimeFoo.script.source).toBe(
          'emit(doc["foo"].value)'
        );
        createdIds.push(response.body[config.serviceKey].id);
      });

      apiTest(
        'can specify optional typeMeta attribute when creating an index pattern',
        async ({ apiClient }) => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              [config.serviceKey]: {
                title,
                typeMeta: {},
              },
            },
          });

          expect(response.statusCode).toBe(200);
          // Track created ID for cleanup - always present on successful creation
          createdIds.push(response.body[config.serviceKey].id);
        }
      );

      apiTest(
        'can specify optional fieldAttrs attribute with count and label when creating an index pattern',
        async ({ apiClient }) => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              [config.serviceKey]: {
                title,
                fieldAttrs: {
                  foo: {
                    count: 123,
                    customLabel: 'test',
                  },
                },
              },
            },
          });

          expect(response.statusCode).toBe(200);
          expect(response.body[config.serviceKey].fieldAttrs.foo.count).toBe(123);
          expect(response.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('test');
          createdIds.push(response.body[config.serviceKey].id);
        }
      );

      apiTest(
        'when creating index pattern with existing name returns error by default',
        async ({ apiClient }) => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await apiClient.post(config.path, {
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

          const response2 = await apiClient.post(config.path, {
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

          expect(response1.statusCode).toBe(200);
          expect(response2.statusCode).toBe(400);
          // Track the first one for cleanup (second one failed)
          createdIds.push(response1.body[config.serviceKey].id);
        }
      );

      apiTest(
        'when creating index pattern with existing name succeeds if override flag is set',
        async ({ apiClient }) => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              [config.serviceKey]: {
                title,
                timeFieldName: 'foo',
              },
            },
          });

          const response2 = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              override: true,
              [config.serviceKey]: {
                title,
                timeFieldName: 'bar',
              },
            },
          });

          expect(response1.statusCode).toBe(200);
          expect(response2.statusCode).toBe(200);
          expect(response1.body[config.serviceKey].timeFieldName).toBe('foo');
          expect(response2.body[config.serviceKey].timeFieldName).toBe('bar');
          expect(response1.body[config.serviceKey].id).toBe(response1.body[config.serviceKey].id);
          // Only track the final one (override replaced the first)
          createdIds.push(response2.body[config.serviceKey].id);
        }
      );
    }
  );
});
