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

const LEGACY_TEMPLATE_NAME = 'test-legacy-template-1';
const AUTOCOMPLETE_API = 'api/console/autocomplete_entities';

apiTest.describe(
  'GET /api/console/autocomplete_entities — legacy templates',
  { tag: [...tags.stateful.classic] },
  () => {
    let credentials: RoleApiCredentials;
    let requestOptions: { headers: Record<string, string>; responseType: 'json' };

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      credentials = await requestAuth.getApiKey('admin');
      requestOptions = {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      };

      await esClient.indices.putTemplate({
        name: LEGACY_TEMPLATE_NAME,
        index_patterns: ['*'],
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.deleteTemplate({ name: LEGACY_TEMPLATE_NAME }, { ignore: [404] });
    });

    apiTest('returns legacy templates when templates setting is enabled', async ({ apiClient }) => {
      const response = await apiClient.get(`${AUTOCOMPLETE_API}?templates=true`, requestOptions);

      expect(response).toHaveStatusCode(200);
      expect(Object.keys(response.body.legacyTemplates)).toContain(LEGACY_TEMPLATE_NAME);
    });
  }
);
