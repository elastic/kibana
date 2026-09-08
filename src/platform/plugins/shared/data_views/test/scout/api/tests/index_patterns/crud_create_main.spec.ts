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
import {
  COMMON_HEADERS,
  ES_ARCHIVE_BASIC_INDEX,
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

apiTest.describe(
  `POST ${DATA_VIEW_PATH_LEGACY} - main (legacy index pattern api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    // Track created index pattern IDs for cleanup
    let createdIds: string[] = [];

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      // Admin role required for creating index patterns and managing spaces
      adminApiCredentials = await requestAuth.getApiKey('admin');
      // Load ES archive for tests that need basic_index
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      // Cleanup: delete all index patterns created during the test
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest('can create an index_pattern with just a title', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      // Track created ID for cleanup - always present on successful creation
      createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
    });

    apiTest('returns back the created index_pattern object', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
          },
        },
      });

      expect(typeof response.body[SERVICE_KEY_LEGACY]).toBe('object');
      expect(response.body[SERVICE_KEY_LEGACY].title).toBe(title);
      expect(typeof response.body[SERVICE_KEY_LEGACY].id).toBe('string');
      expect(response.body[SERVICE_KEY_LEGACY].id.length).toBeGreaterThan(0);
      createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
    });

    apiTest(
      'can specify primitive optional attributes when creating an index pattern',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const id = `test-id-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
              title,
              id,
              type: 'test-type',
              timeFieldName: 'test-timeFieldName',
            },
          },
        });

        expect(response.statusCode).toBe(200);
        expect(response.body[SERVICE_KEY_LEGACY].title).toBe(title);
        expect(response.body[SERVICE_KEY_LEGACY].id).toBe(id);
        expect(response.body[SERVICE_KEY_LEGACY].type).toBe('test-type');
        expect(response.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('test-timeFieldName');
        createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
      }
    );

    apiTest(
      'can specify optional sourceFilters attribute when creating an index pattern',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
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
        expect(response.body[SERVICE_KEY_LEGACY].title).toBe(title);
        expect(response.body[SERVICE_KEY_LEGACY].sourceFilters[0].value).toBe('foo');
        createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
      }
    );

    apiTest(
      'can specify optional fieldFormats attribute when creating an index pattern',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
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
        expect(response.body[SERVICE_KEY_LEGACY].fieldFormats.foo.id).toBe('test-id');
        expect(response.body[SERVICE_KEY_LEGACY].fieldFormats.foo.params).toStrictEqual({});
        createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
      }
    );

    apiTest('can create index pattern with empty title', async ({ apiClient }) => {
      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title: '',
            allowNoIndex: true,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      // Track created ID for cleanup - always present on successful creation
      createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
    });

    apiTest(
      'can specify optional fields attribute when creating an index pattern',
      async ({ apiClient }) => {
        const title = `basic_index*`;
        const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [SERVICE_KEY_LEGACY]: {
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
        expect(response.body[SERVICE_KEY_LEGACY].title).toBe(title);
        expect(response.body[SERVICE_KEY_LEGACY].fields.foo.name).toBe('foo');
        expect(response.body[SERVICE_KEY_LEGACY].fields.foo.customLabel).toBe('Custom Label');
        expect(response.body[SERVICE_KEY_LEGACY].fields.bar.name).toBe('bar'); // created from es index
        expect(response.body[SERVICE_KEY_LEGACY].fields.bar.type).toBe('boolean');
        createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
      }
    );

    apiTest('can add fields created from es index', async ({ apiClient }) => {
      const title = `basic_index*`;
      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: {
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
      expect(response.body[SERVICE_KEY_LEGACY].title).toBe(title);
      expect(response.body[SERVICE_KEY_LEGACY].fields.foo.name).toBe('foo');
      expect(response.body[SERVICE_KEY_LEGACY].fields.foo.type).toBe('number'); // picked up from index
      expect(response.body[SERVICE_KEY_LEGACY].fields.fake).toBeUndefined(); // not in index, so not created
      createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
    });

    apiTest('can add runtime fields', async ({ apiClient }) => {
      const title = `basic_index*`;
      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: {
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
      expect(response.body[SERVICE_KEY_LEGACY].title).toBe(title);
      expect(response.body[SERVICE_KEY_LEGACY].runtimeFieldMap.runtimeFoo.type).toBe('keyword');
      expect(response.body[SERVICE_KEY_LEGACY].runtimeFieldMap.runtimeFoo.script.source).toBe(
        'emit(doc["foo"].value)'
      );
      createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
    });

    apiTest(
      'can specify optional typeMeta attribute when creating an index pattern',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
              title,
              typeMeta: {},
            },
          },
        });

        expect(response.statusCode).toBe(200);
        // Track created ID for cleanup - always present on successful creation
        createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
      }
    );

    apiTest(
      'can specify optional fieldAttrs attribute with count and label when creating an index pattern',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
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
        expect(response.body[SERVICE_KEY_LEGACY].fieldAttrs.foo.count).toBe(123);
        expect(response.body[SERVICE_KEY_LEGACY].fieldAttrs.foo.customLabel).toBe('test');
        createdIds.push(response.body[SERVICE_KEY_LEGACY].id);
      }
    );

    apiTest(
      'when creating index pattern with existing name returns error by default',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
              title,
            },
          },
        });

        const response2 = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
              title,
            },
          },
        });

        expect(response1.statusCode).toBe(200);
        expect(response2.statusCode).toBe(400);
        // Track the first one for cleanup (second one failed)
        createdIds.push(response1.body[SERVICE_KEY_LEGACY].id);
      }
    );

    apiTest(
      'when creating index pattern with existing name succeeds if override flag is set',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
              title,
              timeFieldName: 'foo',
            },
          },
        });

        const response2 = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [SERVICE_KEY_LEGACY]: {
              title,
              timeFieldName: 'bar',
            },
          },
        });

        expect(response1.statusCode).toBe(200);
        expect(response2.statusCode).toBe(200);
        expect(response1.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('foo');
        expect(response2.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('bar');
        expect(response1.body[SERVICE_KEY_LEGACY].id).toBe(response1.body[SERVICE_KEY_LEGACY].id);
        // Only track the final one (override replaced the first)
        createdIds.push(response2.body[SERVICE_KEY_LEGACY].id);
      }
    );
  }
);
