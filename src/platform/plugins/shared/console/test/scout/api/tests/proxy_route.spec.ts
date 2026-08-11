/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';

const PROXY_PATH = `api/console/proxy?method=GET&path=${encodeURIComponent('/.kibana/_settings')}`;

apiTest.describe(
  'POST /api/console/proxy',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
    ],
  },
  () => {
    let credentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKey('admin');
    });

    apiTest('does not forward x-elastic-product-origin', async ({ apiClient }) => {
      const response = await apiClient.post(PROXY_PATH, {
        headers: {
          ...COMMON_HEADERS,
          'x-elastic-product-origin': 'kibana',
          ...credentials.apiKeyHeader,
        },
      });

      expect(response.headers.warning).toBeDefined();
    });
  }
);
