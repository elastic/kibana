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
import { COMMON_HEADERS, DATA_VIEW_PATH, ES_ARCHIVE_BASIC_INDEX } from '../../fixtures/constants';

apiTest.describe(
  `DELETE ${DATA_VIEW_PATH}/{id}/runtime_field/{name} - errors (data view api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let dataViewId: string;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, apiServices }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);

      const { data: dataView } = await apiServices.dataViews.create({
        title: 'b*sic_index',
        override: true,
      });
      dataViewId = dataView.id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId);
      }
    });

    apiTest('returns 404 error on non-existing data view', async ({ apiClient }) => {
      const nonExistentId = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

      const response = await apiClient.delete(
        `${DATA_VIEW_PATH}/${nonExistentId}/runtime_field/foo`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns 404 error on non-existing runtime field', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${DATA_VIEW_PATH}/${dataViewId}/runtime_field/test`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns error when ID is too long', async ({ apiClient }) => {
      const longId = 'x'.repeat(1100);

      const response = await apiClient.delete(`${DATA_VIEW_PATH}/${longId}/runtime_field/foo`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('must have a maximum length of [1000]');
    });
  }
);
