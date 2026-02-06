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
    `DELETE ${config.path}/{id} - main (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;

      apiTest.beforeAll(async ({ requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
      });

      apiTest(`deletes an ${config.serviceKey}`, async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create an index pattern/data view
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

        // Verify it exists
        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);

        // Delete it
        const deleteResponse = await apiClient.delete(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(deleteResponse.statusCode).toBe(200);

        // Verify it no longer exists
        const verifyResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(verifyResponse.statusCode).toBe(404);
      });

      apiTest('returns nothing', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create an index pattern/data view
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

        // Delete it
        const deleteResponse = await apiClient.delete(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        // Verify empty response
        expect(Object.keys(deleteResponse.body)).toHaveLength(0);
      });
    }
  );
});
