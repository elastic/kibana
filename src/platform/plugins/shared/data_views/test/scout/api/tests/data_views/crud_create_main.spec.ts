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
  DATA_VIEW_PATH,
  SERVICE_KEY,
} from '../../fixtures/constants';

apiTest.describe(
  `POST ${DATA_VIEW_PATH} - main (data view api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    // Track created data view IDs for cleanup
    let createdIds: string[] = [];

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      // Admin role required for creating data views and managing spaces
      adminApiCredentials = await requestAuth.getApiKey('admin');
      // Load ES archive for tests that need basic_index
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      // Cleanup: delete all data views created during the test
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest('can create a data view with just a title', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const response = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      // Track created ID for cleanup - always present on successful creation
      createdIds.push(response.body[SERVICE_KEY].id);
    });

    apiTest('returns back the created data view object', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
          },
        },
      });

      expect(typeof response.body[SERVICE_KEY]).toBe('object');
      expect(response.body[SERVICE_KEY].title).toBe(title);
      expect(typeof response.body[SERVICE_KEY].id).toBe('string');
      expect(response.body[SERVICE_KEY].id.length).toBeGreaterThan(0);
      createdIds.push(response.body[SERVICE_KEY].id);
    });

    apiTest(
      'can specify primitive optional attributes when creating a data view',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const id = `test-id-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
              title,
              id,
              type: 'test-type',
              timeFieldName: 'test-timeFieldName',
            },
          },
        });

        expect(response.statusCode).toBe(200);
        expect(response.body[SERVICE_KEY].title).toBe(title);
        expect(response.body[SERVICE_KEY].id).toBe(id);
        expect(response.body[SERVICE_KEY].type).toBe('test-type');
        expect(response.body[SERVICE_KEY].timeFieldName).toBe('test-timeFieldName');
        createdIds.push(response.body[SERVICE_KEY].id);
      }
    );

    apiTest(
      'can specify optional sourceFilters attribute when creating a data view',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
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
        expect(response.body[SERVICE_KEY].title).toBe(title);
        expect(response.body[SERVICE_KEY].sourceFilters[0].value).toBe('foo');
        createdIds.push(response.body[SERVICE_KEY].id);
      }
    );

    apiTest(
      'can specify optional fieldFormats attribute when creating a data view',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
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
        expect(response.body[SERVICE_KEY].fieldFormats.foo.id).toBe('test-id');
        expect(response.body[SERVICE_KEY].fieldFormats.foo.params).toStrictEqual({});
        createdIds.push(response.body[SERVICE_KEY].id);
      }
    );

    apiTest('can create data view with empty title', async ({ apiClient }) => {
      const response = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title: '',
            allowNoIndex: true,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      // Track created ID for cleanup - always present on successful creation
      createdIds.push(response.body[SERVICE_KEY].id);
    });

    apiTest(
      'can specify optional fields attribute when creating a data view',
      async ({ apiClient }) => {
        const title = `basic_index*`;
        const response = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [SERVICE_KEY]: {
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
        expect(response.body[SERVICE_KEY].title).toBe(title);
        expect(response.body[SERVICE_KEY].fields.foo.name).toBe('foo');
        expect(response.body[SERVICE_KEY].fields.foo.customLabel).toBe('Custom Label');
        expect(response.body[SERVICE_KEY].fields.bar.name).toBe('bar'); // created from es index
        expect(response.body[SERVICE_KEY].fields.bar.type).toBe('boolean');
        createdIds.push(response.body[SERVICE_KEY].id);
      }
    );

    apiTest('can add fields created from es index', async ({ apiClient }) => {
      const title = `basic_index*`;
      const response = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: {
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
      expect(response.body[SERVICE_KEY].title).toBe(title);
      expect(response.body[SERVICE_KEY].fields.foo.name).toBe('foo');
      expect(response.body[SERVICE_KEY].fields.foo.type).toBe('number'); // picked up from index
      expect(response.body[SERVICE_KEY].fields.fake).toBeUndefined(); // not in index, so not created
      createdIds.push(response.body[SERVICE_KEY].id);
    });

    apiTest('can add runtime fields', async ({ apiClient }) => {
      const title = `basic_index*`;
      const response = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: {
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
      expect(response.body[SERVICE_KEY].title).toBe(title);
      expect(response.body[SERVICE_KEY].runtimeFieldMap.runtimeFoo.type).toBe('keyword');
      expect(response.body[SERVICE_KEY].runtimeFieldMap.runtimeFoo.script.source).toBe(
        'emit(doc["foo"].value)'
      );
      createdIds.push(response.body[SERVICE_KEY].id);
    });

    apiTest(
      'can specify optional typeMeta attribute when creating a data view',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
              title,
              typeMeta: {},
            },
          },
        });

        expect(response.statusCode).toBe(200);
        // Track created ID for cleanup - always present on successful creation
        createdIds.push(response.body[SERVICE_KEY].id);
      }
    );

    apiTest(
      'can specify optional fieldAttrs attribute with count and label when creating a data view',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
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
        expect(response.body[SERVICE_KEY].fieldAttrs.foo.count).toBe(123);
        expect(response.body[SERVICE_KEY].fieldAttrs.foo.customLabel).toBe('test');
        createdIds.push(response.body[SERVICE_KEY].id);
      }
    );

    apiTest(
      'when creating data view with existing name returns error by default',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
              title,
            },
          },
        });

        const response2 = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
              title,
            },
          },
        });

        expect(response1.statusCode).toBe(200);
        expect(response2.statusCode).toBe(400);
        // Track the first one for cleanup (second one failed)
        createdIds.push(response1.body[SERVICE_KEY].id);
      }
    );

    apiTest(
      'when creating data view with existing name succeeds if override flag is set',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
              title,
              timeFieldName: 'foo',
            },
          },
        });

        const response2 = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [SERVICE_KEY]: {
              title,
              timeFieldName: 'bar',
            },
          },
        });

        expect(response1.statusCode).toBe(200);
        expect(response2.statusCode).toBe(200);
        expect(response1.body[SERVICE_KEY].timeFieldName).toBe('foo');
        expect(response2.body[SERVICE_KEY].timeFieldName).toBe('bar');
        expect(response1.body[SERVICE_KEY].id).toBe(response1.body[SERVICE_KEY].id);
        // Only track the final one (override replaced the first)
        createdIds.push(response2.body[SERVICE_KEY].id);
      }
    );
  }
);
