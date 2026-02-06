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
import { ES_ARCHIVE_BASIC_INDEX } from '../fixtures/constants';

// Internal APIs use version '1' for has_user endpoints
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

// Public API headers for creating data views/index patterns
const PUBLIC_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31',
};

const configArray = [
  {
    name: 'legacy index pattern api',
    path: 'api/index_patterns/index_pattern',
    serviceKey: 'index_pattern',
    hasUserEndpoint: 'api/index_patterns/has_user_index_pattern',
  },
  {
    name: 'data view api',
    path: 'api/data_views/data_view',
    serviceKey: 'data_view',
    hasUserEndpoint: 'api/data_views/has_user_data_view',
  },
];

// Helper function to delete all existing data views
async function deleteAllDataViews(
  apiClient: any,
  headers: Record<string, string>,
  log: any
): Promise<void> {
  // Get all data views
  const listResponse = await apiClient.get('api/data_views', {
    headers,
    responseType: 'json',
  });

  if (listResponse.statusCode === 200 && listResponse.body.data_view) {
    const dataViews = listResponse.body.data_view;
    for (const dv of dataViews) {
      await apiClient.delete(`api/data_views/data_view/${dv.id}`, { headers });
      log.info(`Cleaned up existing data view: ${dv.id}`);
    }
  }
}

apiTest.describe(
  'has user index pattern / data view API',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdPatternId: string | null = null;
    let currentConfig: (typeof configArray)[0];

    apiTest.beforeAll(async ({ requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
    });

    // Legacy API tests
    apiTest(
      'legacy API - should return false if no index patterns exist',
      async ({ apiClient, log }) => {
        currentConfig = configArray[0];

        // First, delete all existing data views to ensure clean state
        await deleteAllDataViews(
          apiClient,
          { ...PUBLIC_HEADERS, ...adminApiCredentials.apiKeyHeader },
          log
        );

        const response = await apiClient.get(currentConfig.hasUserEndpoint, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.result).toBe(false);
      }
    );

    apiTest(
      'legacy API - should return true if has index pattern with user data',
      async ({ apiClient, esArchiver, log }) => {
        currentConfig = configArray[0];

        // Load ES archive with basic_index data
        await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
        log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);

        // Create index pattern for basic_index
        const createResponse = await apiClient.post(currentConfig.path, {
          headers: {
            ...PUBLIC_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [currentConfig.serviceKey]: {
              title: 'basic_index',
            },
          },
        });
        expect(createResponse.statusCode).toBe(200);
        createdPatternId = createResponse.body[currentConfig.serviceKey].id;
        log.info(`Created ${currentConfig.serviceKey} for basic_index: ${createdPatternId}`);

        // Check has_user endpoint
        const response = await apiClient.get(currentConfig.hasUserEndpoint, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.result).toBe(true);

        // Cleanup - delete the created pattern
        await apiClient.delete(`${currentConfig.path}/${createdPatternId}`, {
          headers: {
            ...PUBLIC_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
        });
        log.info(`Deleted ${currentConfig.serviceKey}: ${createdPatternId}`);
        createdPatternId = null;
      }
    );

    apiTest(
      'legacy API - should return true if has user index pattern without data',
      async ({ apiClient, log }) => {
        currentConfig = configArray[0];

        // Create index pattern with allowNoIndex: true (no backing data required)
        const createResponse = await apiClient.post(currentConfig.path, {
          headers: {
            ...PUBLIC_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [currentConfig.serviceKey]: {
              title: 'nonexistent_index',
              allowNoIndex: true,
            },
          },
        });
        expect(createResponse.statusCode).toBe(200);
        createdPatternId = createResponse.body[currentConfig.serviceKey].id;
        log.info(
          `Created ${currentConfig.serviceKey} with allowNoIndex: true: ${createdPatternId}`
        );

        // Check has_user endpoint
        const response = await apiClient.get(currentConfig.hasUserEndpoint, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.result).toBe(true);

        // Cleanup - delete the created pattern
        await apiClient.delete(`${currentConfig.path}/${createdPatternId}`, {
          headers: {
            ...PUBLIC_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
        });
        log.info(`Deleted ${currentConfig.serviceKey}: ${createdPatternId}`);
        createdPatternId = null;
      }
    );

    // Data View API tests
    apiTest(
      'data view API - should return false if no data views exist',
      async ({ apiClient, log }) => {
        currentConfig = configArray[1];

        // First, delete all existing data views to ensure clean state
        await deleteAllDataViews(
          apiClient,
          { ...PUBLIC_HEADERS, ...adminApiCredentials.apiKeyHeader },
          log
        );

        const response = await apiClient.get(currentConfig.hasUserEndpoint, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.result).toBe(false);
      }
    );

    apiTest(
      'data view API - should return true if has data view with user data',
      async ({ apiClient, esArchiver, log }) => {
        currentConfig = configArray[1];

        // Load ES archive with basic_index data
        await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
        log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);

        // Create data view for basic_index
        const createResponse = await apiClient.post(currentConfig.path, {
          headers: {
            ...PUBLIC_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [currentConfig.serviceKey]: {
              title: 'basic_index',
            },
          },
        });
        expect(createResponse.statusCode).toBe(200);
        createdPatternId = createResponse.body[currentConfig.serviceKey].id;
        log.info(`Created ${currentConfig.serviceKey} for basic_index: ${createdPatternId}`);

        // Check has_user endpoint
        const response = await apiClient.get(currentConfig.hasUserEndpoint, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.result).toBe(true);

        // Cleanup - delete the created data view
        await apiClient.delete(`${currentConfig.path}/${createdPatternId}`, {
          headers: {
            ...PUBLIC_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
        });
        log.info(`Deleted ${currentConfig.serviceKey}: ${createdPatternId}`);
        createdPatternId = null;
      }
    );

    apiTest(
      'data view API - should return true if has user data view without data',
      async ({ apiClient, log }) => {
        currentConfig = configArray[1];

        // Create data view with allowNoIndex: true (no backing data required)
        const createResponse = await apiClient.post(currentConfig.path, {
          headers: {
            ...PUBLIC_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [currentConfig.serviceKey]: {
              title: 'nonexistent_index',
              allowNoIndex: true,
            },
          },
        });
        expect(createResponse.statusCode).toBe(200);
        createdPatternId = createResponse.body[currentConfig.serviceKey].id;
        log.info(
          `Created ${currentConfig.serviceKey} with allowNoIndex: true: ${createdPatternId}`
        );

        // Check has_user endpoint
        const response = await apiClient.get(currentConfig.hasUserEndpoint, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.result).toBe(true);

        // Cleanup - delete the created data view
        await apiClient.delete(`${currentConfig.path}/${createdPatternId}`, {
          headers: {
            ...PUBLIC_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
        });
        log.info(`Deleted ${currentConfig.serviceKey}: ${createdPatternId}`);
        createdPatternId = null;
      }
    );
  }
);
