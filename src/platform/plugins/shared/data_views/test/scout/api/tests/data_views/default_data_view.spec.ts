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
import { COMMON_HEADERS, SERVICE_PATH, SERVICE_KEY } from '../../fixtures/constants';

apiTest.describe(
  `default ${SERVICE_KEY} API (data view api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    const newId = () => `default-id-${Date.now()}-${Math.random()}`;
    const defaultPath = `${SERVICE_PATH}/default`;
    const serviceKeyId = `${SERVICE_KEY}_id`;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterEach(async ({ apiClient }) => {
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
    });

    apiTest('can set default data view', async ({ apiClient }) => {
      const defaultId = newId();

      const setResponse = await apiClient.post(defaultPath, {
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

      expect(setResponse).toHaveStatusCode(200);
      expect(setResponse.body.acknowledged).toBe(true);

      const getResponse = await apiClient.get(defaultPath, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[serviceKeyId]).toBe(defaultId);
    });

    apiTest('does not override existing default without force flag', async ({ apiClient }) => {
      const defaultId = newId();

      await apiClient.post(defaultPath, {
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

      const overrideResponse = await apiClient.post(defaultPath, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [serviceKeyId]: newId(),
        },
      });

      expect(overrideResponse).toHaveStatusCode(200);

      const getResponse = await apiClient.get(defaultPath, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[serviceKeyId]).toBe(defaultId);
    });

    apiTest('can clear default data view with force flag', async ({ apiClient }) => {
      const defaultId = newId();

      await apiClient.post(defaultPath, {
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

      const clearResponse = await apiClient.post(defaultPath, {
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

      expect(clearResponse).toHaveStatusCode(200);

      const getResponse = await apiClient.get(defaultPath, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[serviceKeyId]).toBe('');
    });
  }
);
