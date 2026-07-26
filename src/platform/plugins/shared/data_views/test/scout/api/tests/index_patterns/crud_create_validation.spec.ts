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
  `POST ${DATA_VIEW_PATH_LEGACY} - validation (legacy index pattern api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest(
      `returns error when ${SERVICE_KEY_LEGACY} object is not provided`,
      async ({ apiClient }) => {
        const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
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

    apiTest(`returns error on empty ${SERVICE_KEY_LEGACY} object`, async ({ apiClient }) => {
      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {},
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe(
        `[request body.${SERVICE_KEY_LEGACY}.title]: expected value of type [string] but got [undefined]`
      );
    });

    apiTest('returns error when "override" parameter is not a boolean', async ({ apiClient }) => {
      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: 123,
          [SERVICE_KEY_LEGACY]: {
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
        const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
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

        expect(response.statusCode).toBe(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          '[request body.refresh_fields]: expected value of type [boolean] but got [number]'
        );
      }
    );

    apiTest('returns an error when unknown runtime field type', async ({ apiClient }) => {
      const title = 'basic_index*';
      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: {
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
