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
import { COMMON_HEADERS, DATA_VIEW_PATH, ID_OVER_MAX_LENGTH } from '../../fixtures/constants';

apiTest.describe(
  'GET api/data_views/data_view/{id} - errors (data view api)',
  { tag: tags.deploymentAgnostic },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      viewerApiCredentials = await requestAuth.getApiKeyForViewer();
    });

    apiTest('returns 404 error on non-existing data_view', async ({ apiClient }) => {
      const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
      const response = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns error when ID is too long', async ({ apiClient }) => {
      const response = await apiClient.get(`${DATA_VIEW_PATH}/${ID_OVER_MAX_LENGTH}`, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        '[request params.id]: value has length [1759] but it must have a maximum length of [1000].'
      );
    });
  }
);
