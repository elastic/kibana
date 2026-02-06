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
    `DELETE ${config.path}/{id}/runtime_field/{name} - errors (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;
      let indexPatternId: string;

      apiTest.beforeAll(async ({ esArchiver, requestAuth, apiClient, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

        await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
        log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);

        // Create an index pattern/data view for tests that need one
        const basicIndex = 'b*sic_index';
        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title: basicIndex,
            },
          },
        });

        indexPatternId = createResponse.body[config.serviceKey].id;
        log.info(`Created ${config.serviceKey} with ID: ${indexPatternId}`);
      });

      apiTest.afterAll(async ({ apiClient, log }) => {
        // Cleanup: delete the index pattern/data view
        if (indexPatternId) {
          await apiClient.delete(`${config.path}/${indexPatternId}`, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
          });
          log.info(`Deleted ${config.serviceKey} with ID: ${indexPatternId}`);
        }
      });

      apiTest('returns 404 error on non-existing index_pattern', async ({ apiClient }) => {
        const nonExistentId = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

        const response = await apiClient.delete(
          `${config.path}/${nonExistentId}/runtime_field/foo`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(404);
      });

      apiTest('returns 404 error on non-existing runtime field', async ({ apiClient }) => {
        const response = await apiClient.delete(
          `${config.path}/${indexPatternId}/runtime_field/test`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(404);
      });

      apiTest('returns error when ID is too long', async ({ apiClient }) => {
        // Create an ID that exceeds the 1000 character limit
        const longId = 'x'.repeat(1100);

        const response = await apiClient.delete(`${config.path}/${longId}/runtime_field/foo`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('must have a maximum length of [1000]');
      });
    }
  );
});
