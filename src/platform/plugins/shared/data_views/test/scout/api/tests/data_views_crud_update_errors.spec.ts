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
import { COMMON_HEADERS, configArray } from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `POST ${config.path}/{id} - errors (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;
      let createdIds: string[] = [];

      apiTest.beforeAll(async ({ requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
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

      apiTest(
        `returns error when ${config.serviceKey} object is not provided`,
        async ({ apiClient }) => {
          const response = await apiClient.post(`${config.path}/foo`, {
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

      apiTest(`returns error on non-existing ${config.serviceKey}`, async ({ apiClient }) => {
        const response = await apiClient.post(`${config.path}/non-existing-index-pattern`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {},
          },
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.statusCode).toBe(404);
        expect(response.body.message).toBe(
          'Saved object [index-pattern/non-existing-index-pattern] not found'
        );
      });

      apiTest(
        'returns error when "refresh_fields" parameter is not a boolean',
        async ({ apiClient }) => {
          const response = await apiClient.post(`${config.path}/foo`, {
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

      apiTest('returns success when update patch is empty', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
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

        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {},
          },
        });

        expect(updateResponse.statusCode).toBe(200);
      });
    }
  );
});
