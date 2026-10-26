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

// Serverless does not expose the close index API, so these tests only run on stateful classic.
apiTest.describe(
  `GET /${FIELDS_FOR_WILDCARD_PATH} - response (closed index)`,
  { tag: tags.stateful.classic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    // Dedicated indices closed by the tests (basic_index is shared, so never close it).
    const closedIndexNames: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterAll(async ({ esClient }) => {
      for (const index of closedIndexNames.splice(0)) {
        await esClient.indices.delete({ index, ignore_unavailable: true });
      }
    });

    apiTest(
      'returns 200 when index is closed and allow_no_index is true',
      async ({ apiClient, esClient }) => {
        const indexName = `fields-for-wildcard-closed-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        closedIndexNames.push(indexName);
        await esClient.indices.create({ index: indexName });
        await esClient.indices.close({ index: indexName });

        const response = await apiClient.get(
          `${FIELDS_FOR_WILDCARD_PATH}?pattern=${indexName}&allow_no_index=true`,
          {
            headers: {
              ...INTERNAL_COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ fields: [], indices: [] });
      }
    );

    apiTest(
      'returns 404 when index is closed and allow_no_index is false',
      async ({ apiClient, esClient }) => {
        const indexName = `fields-for-wildcard-closed-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        closedIndexNames.push(indexName);
        await esClient.indices.create({ index: indexName });
        await esClient.indices.close({ index: indexName });

        const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?pattern=${indexName}`, {
          headers: {
            ...INTERNAL_COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
