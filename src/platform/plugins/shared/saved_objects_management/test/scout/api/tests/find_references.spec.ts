/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { KBN_ARCHIVES, MANAGEMENT_API } = testData;

apiTest.describe(
  'find - hasReference and hasReferenceOperator',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKey('viewer');
      await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
      await kbnClient.importExport.load(KBN_ARCHIVES.REFERENCES);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.REFERENCES);
      await kbnClient.importExport.unload(KBN_ARCHIVES.BASIC);
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest('search for a reference', async ({ apiClient }) => {
      const hasReference = encodeURIComponent(JSON.stringify({ type: 'ref-type', id: 'ref-1' }));
      const response = await apiClient.get(
        `${MANAGEMENT_API.FIND}?type=visualization&hasReference=${hasReference}`,
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects.map((obj: { id: string }) => obj.id).sort()).toStrictEqual(
        ['only-ref-1', 'ref-1-and-ref-2']
      );
    });

    apiTest('search for multiple references with OR operator', async ({ apiClient }) => {
      const hasReference = encodeURIComponent(
        JSON.stringify([
          { type: 'ref-type', id: 'ref-1' },
          { type: 'ref-type', id: 'ref-2' },
        ])
      );
      const response = await apiClient.get(
        `${MANAGEMENT_API.FIND}?type=visualization&hasReference=${hasReference}&hasReferenceOperator=OR`,
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects.map((obj: { id: string }) => obj.id).sort()).toStrictEqual(
        ['only-ref-1', 'only-ref-2', 'ref-1-and-ref-2']
      );
    });

    apiTest('search for multiple references with AND operator', async ({ apiClient }) => {
      const hasReference = encodeURIComponent(
        JSON.stringify([
          { type: 'ref-type', id: 'ref-1' },
          { type: 'ref-type', id: 'ref-2' },
        ])
      );
      const response = await apiClient.get(
        `${MANAGEMENT_API.FIND}?type=visualization&hasReference=${hasReference}&hasReferenceOperator=AND`,
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects.map((obj: { id: string }) => obj.id)).toStrictEqual([
        'ref-1-and-ref-2',
      ]);
    });
  }
);
