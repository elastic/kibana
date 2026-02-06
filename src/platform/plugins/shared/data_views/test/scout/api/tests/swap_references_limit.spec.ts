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
  SERVICE_PATH,
  KBN_ARCHIVE_SAVED_OBJECTS_BASIC,
  KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS,
} from '../fixtures/constants';

const SWAP_REFERENCES_PATH = `${SERVICE_PATH}/swap_references`;
const SWAP_REFERENCES_PREVIEW_PATH = `${SWAP_REFERENCES_PATH}/_preview`;

apiTest.describe(
  'POST /api/data_views/swap_references - limit affected saved objects',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
    });

    apiTest.beforeEach(async ({ kbnClient, log }) => {
      // Load basic.json first - it contains the toId (91200a00-9efd-11e7-acb3-3dab96693fab)
      await kbnClient.importExport.load(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
      log.info(`Loaded Kibana archive: ${KBN_ARCHIVE_SAVED_OBJECTS_BASIC}`);
      // Load relationships.json - it contains the fromId (8963ca30-3224-11e8-a572-ffca06da1357)
      await kbnClient.importExport.load(KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS);
      log.info(`Loaded Kibana archive: ${KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS}`);
    });

    apiTest.afterEach(async ({ kbnClient, log }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS);
      log.info(`Unloaded Kibana archive: ${KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS}`);
      await kbnClient.importExport.unload(KBN_ARCHIVE_SAVED_OBJECTS_BASIC);
      log.info(`Unloaded Kibana archive: ${KBN_ARCHIVE_SAVED_OBJECTS_BASIC}`);
    });

    apiTest("won't delete if reference remains", async ({ apiClient }) => {
      const response = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
          forId: ['960372e0-3224-11e8-a572-ffca06da1357'],
          delete: true,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.result).toHaveLength(1);
      expect(response.body.deleteStatus.remainingRefs).toBe(1);
      expect(response.body.deleteStatus.deletePerformed).toBe(false);
    });

    apiTest('can limit by id', async ({ apiClient }) => {
      // Confirm preview will find two items
      const previewResponse = await apiClient.post(SWAP_REFERENCES_PREVIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
        },
      });

      expect(previewResponse.statusCode).toBe(200);
      expect(previewResponse.body.result).toHaveLength(2);

      // Limit to one item using forId
      const swapResponse = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
          forId: ['960372e0-3224-11e8-a572-ffca06da1357'],
        },
      });

      expect(swapResponse.statusCode).toBe(200);
      expect(swapResponse.body.result).toHaveLength(1);
    });

    apiTest('can limit by type', async ({ apiClient }) => {
      // Confirm preview will find two items
      const previewResponse = await apiClient.post(SWAP_REFERENCES_PREVIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
        },
      });

      expect(previewResponse.statusCode).toBe(200);
      expect(previewResponse.body.result).toHaveLength(2);

      // Limit to one item using forType
      const swapResponse = await apiClient.post(SWAP_REFERENCES_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
          toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
          forType: 'search',
        },
      });

      expect(swapResponse.statusCode).toBe(200);
      expect(swapResponse.body.result).toHaveLength(1);
    });
  }
);
