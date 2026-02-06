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
import { COMMON_HEADERS, configArray } from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `default ${config.serviceKey} API (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;

      const newId = () => `default-id-${Date.now()}-${Math.random()}`;

      apiTest.beforeAll(async ({ requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
      });

      apiTest.afterEach(async ({ apiClient, log }) => {
        // Always clear the default after each test to ensure clean state
        const defaultPath = `${config.basePath}/default`;
        const serviceKeyId = `${config.serviceKey}_id`;

        try {
          await apiClient.post(defaultPath, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              [serviceKeyId]: null,
              force: true,
            },
          });
          log.info(`Cleared default ${config.serviceKey}`);
        } catch {
          log.info(`Failed to clear default ${config.serviceKey}`);
        }
      });

      apiTest(`can set default ${config.serviceKey}`, async ({ apiClient }) => {
        const defaultId = newId();
        const defaultPath = `${config.basePath}/default`;
        const serviceKeyId = `${config.serviceKey}_id`;

        // Set the default with force: true
        const response1 = await apiClient.post(defaultPath, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [serviceKeyId]: defaultId,
            force: true,
          },
        });

        expect(response1.statusCode).toBe(200);
        expect(response1.body.acknowledged).toBe(true);

        // Verify the default was set
        const response2 = await apiClient.get(defaultPath, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response2.statusCode).toBe(200);
        expect(response2.body[serviceKeyId]).toBe(defaultId);

        // Try to set a new default without force flag
        const response3 = await apiClient.post(defaultPath, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [serviceKeyId]: newId(),
            // no force this time, so this new default shouldn't be set
          },
        });

        expect(response3.statusCode).toBe(200);

        // Verify original default is still used
        const response4 = await apiClient.get(defaultPath, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response4.body[serviceKeyId]).toBe(defaultId);

        // Verify default can be cleared with force: true and null value
        const response5 = await apiClient.post(defaultPath, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [serviceKeyId]: null,
            force: true,
          },
        });

        expect(response5.statusCode).toBe(200);

        // Verify default is cleared (empty string)
        const response6 = await apiClient.get(defaultPath, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response6.body[serviceKeyId]).toBe('');
      });
    }
  );
});
