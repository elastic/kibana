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
import { FIELDS_FOR_WILDCARD_PATH, INTERNAL_COMMON_HEADERS } from '../../fixtures/constants';

apiTest.describe(
  `PUT /${FIELDS_FOR_WILDCARD_PATH} - filter fields`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');

      await esClient.index({
        index: 'helloworld1',
        refresh: true,
        id: 'helloworld',
        document: { hello: 'world' },
      });

      await esClient.index({
        index: 'helloworld2',
        refresh: true,
        id: 'helloworld2',
        document: { bye: 'world' },
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: 'helloworld1', ignore_unavailable: true });
      await esClient.indices.delete({ index: 'helloworld2', ignore_unavailable: true });
    });

    apiTest('can filter', async ({ apiClient }) => {
      const response = await apiClient.put(`${FIELDS_FOR_WILDCARD_PATH}?pattern=helloworld*`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: { index_filter: { exists: { field: 'bye' } } },
      });

      expect(response).toHaveStatusCode(200);

      const fieldNames = response.body.fields.map((fld: { name: string }) => fld.name);
      expect(fieldNames).toContain('bye');
      expect(fieldNames).not.toContain('hello');
    });
  }
);
