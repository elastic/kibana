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
    `POST ${config.path}/{id}/runtime_field/{name} - update errors (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;

      apiTest.beforeAll(async ({ requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
      });

      apiTest('returns 404 error on non-existing index_pattern', async ({ apiClient }) => {
        const nonExistentId = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

        const response = await apiClient.post(`${config.path}/${nonExistentId}/runtime_field/foo`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            runtimeField: {
              type: 'keyword',
              script: {
                source: "doc['something_new'].value",
              },
            },
          },
        });

        expect(response.statusCode).toBe(404);
      });

      apiTest('returns error when field name is specified in body', async ({ apiClient }) => {
        const nonExistentId = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

        // The update endpoint should NOT accept a 'name' field in the body
        // (the name comes from the URL path parameter)
        const response = await apiClient.post(`${config.path}/${nonExistentId}/runtime_field/foo`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'foo',
            runtimeField: {
              type: 'keyword',
              script: {
                source: "doc['something_new'].value",
              },
            },
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          "[request body.name]: a value wasn't expected to be present"
        );
      });
    }
  );
});
