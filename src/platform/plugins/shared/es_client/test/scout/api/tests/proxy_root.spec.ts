/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { COMMON_HEADERS, PROXY_PATH, CLUSTER_MONITOR_ROLE } = testData;

apiTest.describe('Elasticsearch proxy root', { tag: tags.deploymentAgnostic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(CLUSTER_MONITOR_ROLE);
    headers = { ...COMMON_HEADERS, ...cookieHeader };
  });

  apiTest('maps the proxy root to the Elasticsearch root', async ({ apiClient }) => {
    for (const path of [PROXY_PATH, `${PROXY_PATH}/`]) {
      const response = await apiClient.get(path, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      expect(response.body.version.number).toMatch(/\S+/);
    }
  });
});
