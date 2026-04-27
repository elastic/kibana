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
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

apiTest.describe(
  `POST ${DATA_VIEW_PATH_LEGACY}/{id}/fields - errors (legacy index pattern api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest('returns 404 error on non-existing index pattern', async ({ apiClient }) => {
      const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
      const response = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}/fields`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fields: {
            foo: {},
          },
        },
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns error when "fields" payload attribute is invalid', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: { title },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const response = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}/fields`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fields: 123,
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe(
        '[request body.fields]: expected value of type [object] but got [number]'
      );
    });

    apiTest('returns error if no changes are specified', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: { title },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const response = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}/fields`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fields: {
            foo: {},
            bar: {},
            baz: {},
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe('Change set is empty.');
    });

    apiTest('returns validation error for too long customDescription', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: { title },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const response = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}/fields`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fields: {
            foo: {
              customDescription: 'too long value'.repeat(50),
            },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('it must have a maximum length');
    });
  }
);
