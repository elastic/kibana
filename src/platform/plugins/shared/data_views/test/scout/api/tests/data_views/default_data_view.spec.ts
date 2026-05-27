/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture } from '@kbn/scout';
import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, SERVICE_PATH, SERVICE_KEY } from '../../fixtures/constants';

apiTest.describe(
  `default ${SERVICE_KEY} API (data view api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    const testSpaceId = `default-data-view-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const newId = () => `default-id-${Date.now()}-${Math.random()}`;
    const defaultPath = `${SERVICE_PATH}/default`;
    const serviceKeyId = `${SERVICE_KEY}_id`;
    const scopedPath = (path: string) => `s/${testSpaceId}/${path}`;

    function expectDefaultDataView(apiClient: ApiClientFixture, defaultId: string) {
      return expect
        .poll(
          async () => {
            const getResponse = await apiClient.get(scopedPath(defaultPath), {
              headers: {
                ...COMMON_HEADERS,
                ...adminApiCredentials.apiKeyHeader,
              },
              responseType: 'json',
            });
            return getResponse.body[serviceKeyId];
          },
          { timeout: 30_000 }
        )
        .toBe(defaultId);
    }

    apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await apiServices.spaces.create({
        id: testSpaceId,
        name: testSpaceId,
      });
    });

    apiTest.afterEach(async ({ apiClient }) => {
      await apiClient.post(scopedPath(defaultPath), {
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

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(testSpaceId);
    });

    apiTest('can set default data view', async ({ apiClient }) => {
      const defaultId = newId();

      const setResponse = await apiClient.post(scopedPath(defaultPath), {
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

      await expectDefaultDataView(apiClient, defaultId);
    });

    apiTest('does not override existing default without force flag', async ({ apiClient }) => {
      const defaultId = newId();

      await apiClient.post(scopedPath(defaultPath), {
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

      const overrideResponse = await apiClient.post(scopedPath(defaultPath), {
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

      await expectDefaultDataView(apiClient, defaultId);
    });

    apiTest('can clear default data view with force flag', async ({ apiClient }) => {
      const defaultId = newId();

      await apiClient.post(scopedPath(defaultPath), {
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

      const clearResponse = await apiClient.post(scopedPath(defaultPath), {
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

      await expectDefaultDataView(apiClient, '');
    });
  }
);
