/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

const FIELDS_FOR_WILDCARD_PATH = 'internal/data_views/_fields_for_wildcard';

// Internal APIs use version '1' instead of the public API version '2023-10-31'
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

apiTest.describe(
  'PUT /internal/data_views/_fields_for_wildcard - filter fields',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esClient, requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

      // Index document in 'helloworld1': { hello: 'world' }
      await esClient.index({
        index: 'helloworld1',
        refresh: true,
        id: 'helloworld',
        document: { hello: 'world' },
      });
      log.info('Indexed document in helloworld1');

      // Index document in 'helloworld2': { bye: 'world' }
      await esClient.index({
        index: 'helloworld2',
        refresh: true,
        id: 'helloworld2',
        document: { bye: 'world' },
      });
      log.info('Indexed document in helloworld2');
    });

    apiTest.afterAll(async ({ esClient, log }) => {
      // Cleanup indices
      await esClient.indices.delete({ index: 'helloworld1', ignore_unavailable: true });
      await esClient.indices.delete({ index: 'helloworld2', ignore_unavailable: true });
      log.info('Cleaned up helloworld1 and helloworld2 indices');
    });

    apiTest('can filter', async ({ apiClient }) => {
      const response = await apiClient.put(`${FIELDS_FOR_WILDCARD_PATH}?pattern=helloworld*`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: { index_filter: { exists: { field: 'bye' } } },
      });

      expect(response.statusCode).toBe(200);

      const fieldNames = response.body.fields.map((fld: { name: string }) => fld.name);

      // Verify 'bye' field is included
      expect(fieldNames).toContain('bye');
      // Verify 'hello' field is NOT included (filtered out)
      expect(fieldNames).not.toContain('hello');
    });
  }
);
