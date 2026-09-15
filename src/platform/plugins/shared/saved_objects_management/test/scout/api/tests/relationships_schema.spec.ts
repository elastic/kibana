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
import { schema } from '@kbn/config-schema';
import { apiTest, testData } from '../fixtures';

const { KBN_ARCHIVES, SAVED_OBJECT_IDS, relationshipsUrl } = testData;

const relationSchema = schema.object({
  id: schema.string(),
  type: schema.string(),
  relationship: schema.oneOf([schema.literal('parent'), schema.literal('child')]),
  meta: schema.object({
    title: schema.string(),
    icon: schema.string(),
    editUrl: schema.maybe(schema.string()),
    inAppUrl: schema.maybe(
      schema.object({ path: schema.string(), uiCapabilitiesPath: schema.string() })
    ),
    namespaceType: schema.string(),
    hiddenType: schema.boolean(),
  }),
  managed: schema.maybe(schema.boolean()),
  references: schema.arrayOf(
    schema.object({ name: schema.string(), type: schema.string(), id: schema.string() })
  ),
});

const invalidRelationSchema = schema.object({
  id: schema.string(),
  type: schema.string(),
  relationship: schema.oneOf([schema.literal('parent'), schema.literal('child')]),
  error: schema.string(),
});

const responseSchema = schema.object({
  relations: schema.arrayOf(relationSchema),
  invalidRelations: schema.arrayOf(invalidRelationSchema),
});

apiTest.describe(
  'relationships - validate response schema',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKey('viewer');
      await kbnClient.importExport.load(KBN_ARCHIVES.RELATIONSHIPS);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.RELATIONSHIPS);
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest('search', async ({ apiClient }) => {
      const response = await apiClient.get(relationshipsUrl('search', SAVED_OBJECT_IDS.SEARCH), {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      });
      expect(response).toHaveStatusCode(200);
      expect(() => responseSchema.validate(response.body)).not.toThrow();
    });

    apiTest('dashboard', async ({ apiClient }) => {
      const response = await apiClient.get(
        relationshipsUrl('dashboard', SAVED_OBJECT_IDS.DASHBOARD),
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );
      expect(response).toHaveStatusCode(200);
      expect(() => responseSchema.validate(response.body)).not.toThrow();
    });

    apiTest('visualization', async ({ apiClient }) => {
      const response = await apiClient.get(
        relationshipsUrl('visualization', SAVED_OBJECT_IDS.VISUALIZATION_FROM_SEARCH),
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );
      expect(response).toHaveStatusCode(200);
      expect(() => responseSchema.validate(response.body)).not.toThrow();
    });

    apiTest('index-pattern', async ({ apiClient }) => {
      const response = await apiClient.get(
        relationshipsUrl('index-pattern', SAVED_OBJECT_IDS.INDEX_PATTERN),
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );
      expect(response).toHaveStatusCode(200);
      expect(() => responseSchema.validate(response.body)).not.toThrow();
    });

    apiTest('invalid-refs', async ({ apiClient }) => {
      const response = await apiClient.get(relationshipsUrl('dashboard', 'invalid-refs'), {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      });
      expect(response).toHaveStatusCode(200);
      expect(() => responseSchema.validate(response.body)).not.toThrow();
    });
  }
);
