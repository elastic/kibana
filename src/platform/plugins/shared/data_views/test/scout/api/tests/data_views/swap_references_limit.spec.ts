/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Split from `swap_references/main.ts` (nested `describe('limit affected saved objects')`)
// into its own Scout spec per the one-suite-per-file guideline.

import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  COMMON_HEADERS,
  DATA_VIEW_PATH,
  KBN_ARCHIVE_SAVED_OBJECTS_BASIC,
  KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS,
  SERVICE_KEY,
  SWAP_REFERENCES_PATH,
  SWAP_REFERENCES_PREVIEW_PATH,
} from '../../fixtures/constants';

apiTest.describe(
  `POST ${SWAP_REFERENCES_PATH} - limit affected saved objects (data view api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let dataViewId: string;

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
      await kbnClient.importExport.load(KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS);
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS);
      await kbnClient.importExport.unload(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId);
      }
    });

    apiTest("won't delete if reference remains", async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
          forId: ['960372e0-3224-11e8-a572-ffca06da1357'],
          delete: true,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.result).toHaveLength(1);
      expect(response.body.deleteStatus.remainingRefs).toBe(1);
      expect(response.body.deleteStatus.deletePerformed).toBe(false);
    });

    apiTest('can limit by id', async ({ apiClient }) => {
      const previewResponse = await apiClient.post(SWAP_REFERENCES_PREVIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
        },
      });

      expect(previewResponse).toHaveStatusCode(200);
      expect(previewResponse.body.result).toHaveLength(2);

      const swapResponse = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
          forId: ['960372e0-3224-11e8-a572-ffca06da1357'],
        },
      });

      expect(swapResponse).toHaveStatusCode(200);
      expect(swapResponse.body.result).toHaveLength(1);
    });

    apiTest('can limit by type', async ({ apiClient }) => {
      const previewResponse = await apiClient.post(SWAP_REFERENCES_PREVIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
        },
      });

      expect(previewResponse).toHaveStatusCode(200);
      expect(previewResponse.body.result).toHaveLength(2);

      const swapResponse = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
          forType: 'search',
        },
      });

      expect(swapResponse).toHaveStatusCode(200);
      expect(swapResponse.body.result).toHaveLength(1);
    });
  }
);
