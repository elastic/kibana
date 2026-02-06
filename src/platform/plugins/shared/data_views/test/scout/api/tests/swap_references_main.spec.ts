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
import {
  COMMON_HEADERS,
  DATA_VIEW_PATH,
  SERVICE_PATH,
  KBN_ARCHIVE_SAVED_OBJECTS_BASIC,
} from '../fixtures/constants';

const SWAP_REFERENCES_PATH = `${SERVICE_PATH}/swap_references`;
const SWAP_REFERENCES_PREVIEW_PATH = `${SWAP_REFERENCES_PATH}/_preview`;

apiTest.describe(
  'POST /api/data_views/swap_references - main',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let dataViewId: string;
    const title = 'logs-*';
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
            title,
          },
        },
      });

      dataViewId = createResponse.body.data_view.id;
      log.info(`Created data view with ID: ${dataViewId}`);
    });

    apiTest.beforeEach(async ({ kbnClient, log }) => {
      await kbnClient.importExport.load(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
      log.info(`Loaded Kibana archive: ${KBN_ARCHIVE_SAVED_OBJECTS_BASIC}`);
    });

    apiTest.afterEach(async ({ kbnClient, log }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
      log.info(`Unloaded Kibana archive: ${KBN_ARCHIVE_SAVED_OBJECTS_BASIC}`);
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

    apiTest('can preview', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PREVIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
          toId: dataViewId,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    apiTest('can preview specifying type', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PREVIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
          fromType: 'index-pattern',
          toId: dataViewId,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    apiTest('can save changes', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
          toId: dataViewId,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.result).toHaveLength(1);
      expect(response.body.result[0].id).toBe('dd7caf20-9efd-11e7-acb3-3dab96693fab');
      expect(response.body.result[0].type).toBe('visualization');
    });

    apiTest('can save changes and remove old saved object', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
          toId: dataViewId,
          delete: true,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.result).toHaveLength(1);
      expect(response.body.deleteStatus.remainingRefs).toBe(0);
      expect(response.body.deleteStatus.deletePerformed).toBe(true);

      // Verify the old data view was deleted
      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${prevDataViewId}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse.statusCode).toBe(404);
    });
  }
);
