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
  DATA_VIEW_PATH_LEGACY,
  ES_ARCHIVE_BASIC_INDEX,
  HAS_USER_INDEX_PATTERN_PATH,
  INTERNAL_COMMON_HEADERS,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

apiTest.describe(
  `GET ${HAS_USER_INDEX_PATTERN_PATH} (legacy index pattern api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    // The "returns false" assertion needs a guaranteed empty starting state. Instead of
    // `cleanStandardList()` (a cluster-wide saved-object wipe that can break other suites
    // sharing the deployment) we narrowly delete just the existing index patterns and the
    // two test indices the suite reads from.
    apiTest.beforeEach(async ({ esClient, apiServices }) => {
      const { data: existing } = await apiServices.dataViews.getAll();
      for (const dv of existing) {
        await apiServices.dataViews.delete(dv.id);
      }
      for (const index of ['metrics-test', 'logs-test']) {
        if (await esClient.indices.exists({ index })) {
          await esClient.indices.delete({ index });
        }
      }
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest('returns false if no index patterns exist', async ({ apiClient }) => {
      const response = await apiClient.get(HAS_USER_INDEX_PATTERN_PATH, {
        headers: { ...INTERNAL_COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.result).toBe(false);
    });

    apiTest(
      'returns true if has index pattern with user data',
      async ({ apiClient, esArchiver }) => {
        await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);

        const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: {
            override: true,
            [SERVICE_KEY_LEGACY]: { title: 'basic_index' },
          },
        });
        expect(createResponse).toHaveStatusCode(200);
        createdIds.push(createResponse.body[SERVICE_KEY_LEGACY].id);

        const response = await apiClient.get(HAS_USER_INDEX_PATTERN_PATH, {
          headers: { ...INTERNAL_COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.result).toBe(true);
      }
    );

    apiTest('returns true if has user index pattern without data', async ({ apiClient }) => {
      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: {
            title: 'basic_index',
            allowNoIndex: true,
          },
        },
      });
      expect(createResponse).toHaveStatusCode(200);
      createdIds.push(createResponse.body[SERVICE_KEY_LEGACY].id);

      const response = await apiClient.get(HAS_USER_INDEX_PATTERN_PATH, {
        headers: { ...INTERNAL_COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.result).toBe(true);
    });
  }
);
