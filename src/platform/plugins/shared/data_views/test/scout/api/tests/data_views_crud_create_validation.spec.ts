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
import { COMMON_HEADERS, configArray } from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `POST ${config.path} - validation (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;

      apiTest.beforeAll(async ({ requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
      });

      apiTest(
        `returns error when ${config.serviceKey} object is not provided`,
        async ({ apiClient }) => {
          const response = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: null,
          });

          expect(response.statusCode).toBe(400);
          expect(response.body.statusCode).toBe(400);
          expect(response.body.message).toBe(
            '[request body]: expected a plain object value, but found [null] instead.'
          );
        }
      );

      apiTest(`returns error on empty ${config.serviceKey} object`, async ({ apiClient }) => {
        const response = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {},
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          `[request body.${config.serviceKey}.title]: expected value of type [string] but got [undefined]`
        );
      });

      apiTest('returns error when "override" parameter is not a boolean', async ({ apiClient }) => {
        const response = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: 123,
            [config.serviceKey]: {
              title: 'foo',
            },
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          '[request body.override]: expected value of type [boolean] but got [number]'
        );
      });

      apiTest(
        'returns error when "refresh_fields" parameter is not a boolean',
        async ({ apiClient }) => {
          const response = await apiClient.post(config.path, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              refresh_fields: 123,
              [config.serviceKey]: {
                title: 'foo',
              },
            },
          });

          expect(response.statusCode).toBe(400);
          expect(response.body.statusCode).toBe(400);
          expect(response.body.message).toBe(
            '[request body.refresh_fields]: expected value of type [boolean] but got [number]'
          );
        }
      );

      apiTest('returns an error when unknown runtime field type', async ({ apiClient }) => {
        const title = 'basic_index*';
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
                  type: 'wrong-type',
                  script: {
                    source: 'emit(doc["foo"].value)',
                  },
                },
              },
            },
          },
        });

        expect(response.statusCode).toBe(400);
      });
    }
  );
});
