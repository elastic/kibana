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
  'GET api/index_patterns/index_pattern/{id} - main (legacy index pattern api)',
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

    apiTest('can retrieve an index pattern', async ({ apiClient }) => {
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
      const createdId = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(createdId);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${createdId}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].title).toBe(title);
    });
  }
);
