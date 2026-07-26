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
  KBN_ARCHIVE_SAVED_OBJECTS_BASIC,
  SERVICE_KEY,
  SWAP_REFERENCES_PATH,
  SWAP_REFERENCES_PREVIEW_PATH,
} from '../../fixtures/constants';

apiTest.describe(
  `POST ${SWAP_REFERENCES_PATH} - main (data view api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let dataViewId: string;
    const prevDataViewId = '91200a00-9efd-11e7-acb3-3dab96693fab';

    apiTest.beforeAll(async ({ apiClient, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { [SERVICE_KEY]: { title: 'logs-*' } },
      });
      // Fail fast in setup so suite-level errors don't cascade as confusing assertion errors.
      expect(createResponse).toHaveStatusCode(200);
      dataViewId = createResponse.body[SERVICE_KEY].id;
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.importExport.load(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId);
      }
    });

    apiTest('can preview', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PREVIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
          toId: dataViewId,
        },
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('can preview specifying type', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PREVIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
          fromType: 'index-pattern',
          toId: dataViewId,
        },
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('can save changes', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
          toId: dataViewId,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.result).toHaveLength(1);
      expect(response.body.result[0].id).toBe('dd7caf20-9efd-11e7-acb3-3dab96693fab');
      expect(response.body.result[0].type).toBe('visualization');
    });

    apiTest('can save changes and remove old saved object', async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: prevDataViewId,
          toId: dataViewId,
          delete: true,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.result).toHaveLength(1);
      expect(response.body.deleteStatus.remainingRefs).toBe(0);
      expect(response.body.deleteStatus.deletePerformed).toBe(true);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${prevDataViewId}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(404);
    });
  }
);
