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
import { COMMON_HEADERS, DATA_VIEW_PATH, SERVICE_KEY } from '../../fixtures/constants';

apiTest.describe(
  `POST ${DATA_VIEW_PATH}/{id} - errors (data view api)`,
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

    apiTest('returns error when data_view object is not provided', async ({ apiClient }) => {
      const response = await apiClient.post(`${DATA_VIEW_PATH}/foo`, {
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
    });

    apiTest('returns error on non-existing data view', async ({ apiClient }) => {
      const response = await apiClient.post(`${DATA_VIEW_PATH}/non-existing-index-pattern`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {},
        },
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toBe(
        'Saved object [index-pattern/non-existing-index-pattern] not found'
      );
    });

    apiTest(
      'returns error when "refresh_fields" parameter is not a boolean',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${DATA_VIEW_PATH}/foo`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            refresh_fields: 123,
            [SERVICE_KEY]: {
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
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
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

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {},
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
    });
  }
);
