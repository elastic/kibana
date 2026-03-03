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
  `POST ${DATA_VIEW_PATH_LEGACY}/{id} - errors (legacy index pattern api)`,
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

    apiTest(
      'returns error when index_pattern object is not provided',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/foo`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: null,
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          '[request body]: expected a plain object value, but found [null] instead.'
        );
      }
    );

    apiTest('returns error on non-existing index pattern', async ({ apiClient }) => {
      const response = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/non-existing-index-pattern`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {},
          },
        }
      );

      expect(response).toHaveStatusCode(404);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toBe(
        'Saved object [index-pattern/non-existing-index-pattern] not found'
      );
    });

    apiTest(
      'returns error when "refresh_fields" parameter is not a boolean',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/foo`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            refresh_fields: 123,
            [SERVICE_KEY_LEGACY]: {
              title: 'foo',
            },
          },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          '[request body.refresh_fields]: expected value of type [boolean] but got [number]'
        );
      }
    );

    apiTest('returns success when update patch is empty', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
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

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {},
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
    });
  }
);
