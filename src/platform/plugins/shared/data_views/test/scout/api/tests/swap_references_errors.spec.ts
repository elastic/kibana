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
import { COMMON_HEADERS, DATA_VIEW_PATH, SERVICE_PATH } from '../fixtures/constants';

const SWAP_REFERENCES_PATH = `${SERVICE_PATH}/swap_references`;

apiTest.describe(
  'POST /api/data_views/swap_references - errors',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let dataViewId: string;
    const prevDataViewId = '91200a00-9efd-11e7-acb3-3dab96693fab';

    apiTest.beforeAll(async ({ apiClient, requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

      // Create a data view to use as target
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          data_view: {
            title: 'logs-*',
          },
        },
      });

      dataViewId = createResponse.body.data_view.id;
      log.info(`Created data view with ID: ${dataViewId}`);
    });

    apiTest.afterAll(async ({ apiClient, log }) => {
      // Cleanup: delete the data view
      if (dataViewId) {
        await apiClient.delete(`${DATA_VIEW_PATH}/${dataViewId}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
        });
        log.info(`Deleted data view with ID: ${dataViewId}`);
      }
    });

    apiTest('requires toId parameter', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    apiTest('requires fromId parameter', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          toId: dataViewId,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  }
);
