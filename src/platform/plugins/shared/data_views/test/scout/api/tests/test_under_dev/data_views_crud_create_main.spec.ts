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
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, log }) => {
      // Use admin role - API key auth for public endpoints
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
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
    });
  });
});
