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
  ES_ARCHIVE_BASIC_INDEX,
  EXISTING_INDICES_PATH,
  INTERNAL_COMMON_HEADERS,
} from '../../fixtures/constants';

apiTest.describe(
  `GET /${EXISTING_INDICES_PATH} - response`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest('returns an array of existing indices', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('indices', 'basic_index');
      params.append('indices', 'bad_index');

      const response = await apiClient.get(`${EXISTING_INDICES_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(['basic_index']);
    });

    apiTest('returns an empty array when no indices exist', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('indices', 'bad_index');

      const response = await apiClient.get(`${EXISTING_INDICES_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual([]);
    });
  }
);
