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
  ES_ARCHIVE_BASIC_INDEX,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

apiTest.describe(
  `PUT ${DATA_VIEW_PATH_LEGACY}/{id}/runtime_field - errors (legacy index pattern api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest('returns 404 error on non-existing index pattern', async ({ apiClient }) => {
      const nonExistentId = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

      const response = await apiClient.put(
        `${DATA_VIEW_PATH_LEGACY}/${nonExistentId}/runtime_field`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeBar',
            runtimeField: {
              type: 'long',
              script: { source: "emit(doc['field_name'].value)" },
            },
          },
        }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns error on non-runtime field update attempt', async ({ apiClient }) => {
      const title = `basic_index`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: { title },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      // 'bar' is a regular field from basic_index, not a runtime field.
      const putResponse = await apiClient.put(`${DATA_VIEW_PATH_LEGACY}/${id}/runtime_field`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          name: 'bar',
          runtimeField: {
            type: 'long',
            script: { source: "emit(doc['field_name'].value)" },
          },
        },
      });

      expect(putResponse).toHaveStatusCode(400);
      expect(putResponse.body.message).toBe('Only runtime fields can be updated');
    });
  }
);
