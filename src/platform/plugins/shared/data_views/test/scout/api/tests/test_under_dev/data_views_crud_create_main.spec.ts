/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, apiTest } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { COMMON_HEADERS, configArray } from '../../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(`POST ${config.path} - main (${config.name})`, { tag: ['@svlOblt'] }, () => {
    let dataViewsApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      // Use admin role which should have all privileges including indexPatterns
      dataViewsApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest('debug - test status endpoint', async ({ apiClient, log }) => {
      log.info('Testing /api/status endpoint to verify auth works');
      const statusResponse = await apiClient.get('/api/status', {
        headers: {
          ...COMMON_HEADERS,
          ...dataViewsApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });
      log.info(`Status endpoint response code: ${statusResponse.statusCode}`);

      // Check if dataViews plugin is loaded
      if (statusResponse.body && statusResponse.body.status && statusResponse.body.status.plugins) {
        const dataViewsPlugin = statusResponse.body.status.plugins.dataViews;
        log.info(`dataViews plugin status: ${JSON.stringify(dataViewsPlugin, null, 2)}`);
      }
    });

    apiTest('debug - list data views', async ({ apiClient, log }) => {
      log.info('Testing GET /api/data_views to list existing data views');
      const listResponse = await apiClient.get('/api/data_views', {
        headers: {
          ...COMMON_HEADERS,
          ...dataViewsApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });
      log.info(`List data views response code: ${listResponse.statusCode}`);
      log.info(`List data views response: ${JSON.stringify(listResponse.body, null, 2)}`);
    });

    apiTest('can create an index_pattern with just a title', async ({ apiClient, log }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      log.info(`Testing endpoint: ${config.path}`);
      log.info(`Service key: ${config.serviceKey}`);
      log.info(`Title: ${title}`);

      const response = await apiClient.post(config.path, {
        headers: {
          ...COMMON_HEADERS,
          ...dataViewsApiCredentials.apiKeyHeader,
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
    });

    apiTest('returns back the created index_pattern object', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await apiClient.post(config.path, {
        headers: {
          ...COMMON_HEADERS,
          ...dataViewsApiCredentials.apiKeyHeader,
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
    });

    apiTest(
      'can specify primitive optional attributes when creating an index pattern',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const id = `test-id-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...dataViewsApiCredentials.apiKeyHeader,
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
      }
    );

    apiTest(
      'can specify optional sourceFilters attribute when creating an index pattern',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...dataViewsApiCredentials.apiKeyHeader,
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
      }
    );

    apiTest(
      'can specify optional fieldFormats attribute when creating an index pattern',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...dataViewsApiCredentials.apiKeyHeader,
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
        expect(response.body[config.serviceKey].fieldFormats.foo.params).toEqual({});
      }
    );

    apiTest('can create index pattern with empty title', async ({ apiClient }) => {
      const response = await apiClient.post(config.path, {
        headers: {
          ...COMMON_HEADERS,
          ...dataViewsApiCredentials.apiKeyHeader,
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
    });
  });
});
