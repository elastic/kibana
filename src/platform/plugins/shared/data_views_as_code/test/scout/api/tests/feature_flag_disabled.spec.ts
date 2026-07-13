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
  BASE_PATH,
  COMMON_HEADERS,
  DATA_VIEWS_AS_CODE_ENABLED_FEATURE_FLAG,
} from '../fixtures/constants';

apiTest.describe('data views as code feature flag', { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKeyForAdmin();
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [DATA_VIEWS_AS_CODE_ENABLED_FEATURE_FLAG]: false,
      },
    });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [DATA_VIEWS_AS_CODE_ENABLED_FEATURE_FLAG]: true,
      },
    });
  });

  apiTest('returns 404 from the GET endpoint when disabled', async ({ apiClient }) => {
    const response = await apiClient.get(`${BASE_PATH}/disabled-feature-test`, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('returns 404 from the POST endpoint when disabled', async ({ apiClient }) => {
    const response = await apiClient.post(BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      body: {
        index_pattern: 'disabled-feature-test-*',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('returns 404 from the DELETE endpoint when disabled', async ({ apiClient }) => {
    const response = await apiClient.delete(`${BASE_PATH}/disabled-feature-test`, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
