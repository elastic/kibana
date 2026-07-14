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
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY,
} from '../fixtures/constants';

apiTest.describe('Discover sessions API feature flag', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY]: false,
      },
    });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY]: true,
      },
    });
  });

  apiTest('returns 404 from the POST endpoint when disabled', async ({ apiClient }) => {
    const response = await apiClient.post(DISCOVER_SESSION_API_BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: {
        title: 'Disabled Discover sessions API',
        tabs: [
          {
            id: 'main',
            label: 'Main',
            data_source: {
              type: 'esql',
              query: 'FROM logs-* | LIMIT 10',
            },
          },
        ],
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
