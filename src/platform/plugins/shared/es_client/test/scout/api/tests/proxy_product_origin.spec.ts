/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { COMMON_HEADERS, PROXY_PATH } = testData;
const SYSTEM_INDEX_PATH = `${PROXY_PATH}/.kibana/_settings`;

apiTest.describe('Elasticsearch proxy product origin', { tag: [...tags.stateful.classic] }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest('passes a Kibana product origin through to Elasticsearch', async ({ apiClient }) => {
    const response = await apiClient.get(SYSTEM_INDEX_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...credentials.apiKeyHeader,
        'x-elastic-product-origin': 'kibana',
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.headers.warning).toBeUndefined();
  });

  apiTest('sends no product origin WHEN the client sends none', async ({ apiClient }) => {
    const response = await apiClient.get(SYSTEM_INDEX_PATH, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.headers.warning).toMatch(/^299 .*system indices/);
  });
});
