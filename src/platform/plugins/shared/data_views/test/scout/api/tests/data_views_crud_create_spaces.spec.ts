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
import { COMMON_HEADERS, DATA_VIEW_PATH, SERVICE_KEY, SERVICE_PATH } from '../fixtures/constants';

/**
 * Tests for data view namespaces/spaces functionality.
 * Note: These tests only apply to the new data view API (not the legacy index_pattern API).
 * The namespaces feature allows data views to be shared across multiple Kibana spaces.
 */
apiTest.describe(
  'POST /api/data_views/data_view - spaces/namespaces',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    const fooNamespace = `foo-namespace-${Date.now()}`;
    // Track created data view IDs for cleanup
    let createdDataViewIds: string[] = [];

    apiTest.beforeAll(async ({ kbnClient, requestAuth, log }) => {
      // Admin role required for creating data views and managing spaces
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

      // Create a custom space for testing namespace functionality
      await kbnClient.spaces.create({
        id: fooNamespace,
        name: fooNamespace,
      });
      log.info(`Created space: ${fooNamespace}`);
    });

    apiTest.afterEach(async ({ apiClient, log }) => {
      // Cleanup: delete all data views created during the test
      for (const id of createdDataViewIds) {
        try {
          await apiClient.delete(`${DATA_VIEW_PATH}/${id}`, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
          });
          log.debug(`Cleaned up data view with id: ${id}`);
        } catch (e) {
          log.debug(`Failed to clean up data view with id: ${id}: ${(e as Error).message}`);
        }
      }
      createdDataViewIds = [];
    });

    apiTest.afterAll(async ({ kbnClient, log }) => {
      // Cleanup: delete the test space
      try {
        await kbnClient.spaces.delete(fooNamespace);
        log.info(`Deleted space: ${fooNamespace}`);
      } catch (e) {
        log.debug(`Failed to delete space ${fooNamespace}: ${(e as Error).message}`);
      }
    });

    apiTest(
      'can specify optional namespaces array when creating a data view',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const namespaces = ['default', fooNamespace];

        const createResponse = await apiClient.post(DATA_VIEW_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
              title,
              namespaces,
            },
          },
        });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body[SERVICE_KEY].namespaces).toStrictEqual(namespaces);
        createdDataViewIds.push(createResponse.body[SERVICE_KEY].id);

        // Verify the data view is accessible via the list endpoint
        const getResponse = await apiClient.get(SERVICE_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        const dataView = getResponse.body[SERVICE_KEY].find(
          (dv: { title: string }) => dv.title === title
        );
        expect(dataView).toBeDefined();
        expect(dataView.namespaces).toStrictEqual(namespaces);
      }
    );

    apiTest(
      'sets namespaces to the current space if namespaces array is not specified',
      async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        // Create data view in the custom space (no namespaces specified)
        const createResponse = await apiClient.post(`s/${fooNamespace}/${DATA_VIEW_PATH}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [SERVICE_KEY]: {
              title,
            },
          },
        });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body[SERVICE_KEY].namespaces).toStrictEqual([fooNamespace]);
        const createdId = createResponse.body[SERVICE_KEY].id;

        // Verify via the list endpoint in the same space
        const getResponse = await apiClient.get(`s/${fooNamespace}/${SERVICE_PATH}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        const dataView = getResponse.body[SERVICE_KEY].find(
          (dv: { title: string }) => dv.title === title
        );
        expect(dataView).toBeDefined();
        expect(dataView.namespaces).toStrictEqual([fooNamespace]);

        // Cleanup in the specific space where it was created
        await apiClient.delete(`s/${fooNamespace}/${DATA_VIEW_PATH}/${createdId}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
        });
      }
    );
  }
);
