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
  DATA_VIEW_PATH,
  SERVICE_KEY,
  SERVICE_PATH,
} from '../../fixtures/constants';

/**
 * Tests for data view namespaces/spaces functionality.
 * Note: These tests only apply to the new data view API (not the legacy index_pattern API).
 * The namespaces feature allows data views to be shared across multiple Kibana spaces.
 */
apiTest.describe(
  'POST /api/data_views/data_view - spaces/namespaces',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    const fooNamespace = `foo-namespace-${Date.now()}`;
    // Track created data views for cleanup (with optional spaceId)
    let createdDataViews: Array<{ id: string; spaceId?: string }> = [];

    apiTest.beforeAll(async ({ apiServices, requestAuth, log }) => {
      // Admin role required for creating data views and managing spaces
      adminApiCredentials = await requestAuth.getApiKey('admin');

      // Create a custom space for testing namespace functionality
      await apiServices.spaces.create({
        id: fooNamespace,
        name: fooNamespace,
      });
      log.info(`Created space: ${fooNamespace}`);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      // Cleanup: delete all data views created during the test
      for (const { id, spaceId } of createdDataViews) {
        await apiServices.dataViews.delete(id, spaceId);
      }
      createdDataViews = [];
    });

    apiTest.afterAll(async ({ apiServices, log }) => {
      // Cleanup: delete the test space (404 is ignored)
      await apiServices.spaces.delete(fooNamespace);
      log.info(`Deleted space: ${fooNamespace}`);
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
        createdDataViews.push({ id: createResponse.body[SERVICE_KEY].id });

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
        createdDataViews.push({
          id: createResponse.body[SERVICE_KEY].id,
          spaceId: fooNamespace,
        });

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
      }
    );
  }
);
