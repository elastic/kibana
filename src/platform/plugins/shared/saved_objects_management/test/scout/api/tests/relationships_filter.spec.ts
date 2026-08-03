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

const { KBN_ARCHIVES, SAVED_OBJECT_IDS, relationshipsUrl, sortRelations } = testData;

apiTest.describe(
  'relationships - filter based on savedObjectTypes',
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
      const response = await apiClient.get(
        relationshipsUrl('search', SAVED_OBJECT_IDS.SEARCH, ['visualization']),
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );

      expect(response).toHaveStatusCode(200);
      expect(sortRelations(response.body.relations)).toMatchObject(
        sortRelations([
          {
            id: SAVED_OBJECT_IDS.INDEX_PATTERN,
            type: 'index-pattern',
            relationship: 'child',
            meta: {
              icon: 'indexPatternApp',
              title: 'saved_objects*',
              namespaceType: 'multiple',
              hiddenType: false,
            },
            managed: false,
          },
          {
            id: SAVED_OBJECT_IDS.VISUALIZATION_FROM_SEARCH,
            type: 'visualization',
            relationship: 'parent',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            managed: false,
          },
        ])
      );
    });

    apiTest('dashboard', async ({ apiClient }) => {
      const response = await apiClient.get(
        relationshipsUrl('dashboard', SAVED_OBJECT_IDS.DASHBOARD, ['search']),
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );

      expect(response).toHaveStatusCode(200);
      expect(sortRelations(response.body.relations)).toMatchObject(
        sortRelations([
          {
            id: SAVED_OBJECT_IDS.VISUALIZATION_BASIC,
            type: 'visualization',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            managed: false,
          },
          {
            id: SAVED_OBJECT_IDS.VISUALIZATION_FROM_SEARCH,
            type: 'visualization',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            managed: false,
          },
        ])
      );
    });

    apiTest('visualization', async ({ apiClient }) => {
      const response = await apiClient.get(
        relationshipsUrl('visualization', SAVED_OBJECT_IDS.VISUALIZATION_FROM_SEARCH, ['search']),
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );

      expect(response).toHaveStatusCode(200);
      expect(sortRelations(response.body.relations)).toMatchObject(
        sortRelations([
          {
            id: SAVED_OBJECT_IDS.SEARCH,
            type: 'search',
            relationship: 'child',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            managed: false,
          },
        ])
      );
    });

    apiTest('index-pattern', async ({ apiClient }) => {
      const response = await apiClient.get(
        relationshipsUrl('index-pattern', SAVED_OBJECT_IDS.INDEX_PATTERN, ['search']),
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );

      expect(response).toHaveStatusCode(200);
      expect(sortRelations(response.body.relations)).toMatchObject(
        sortRelations([
          {
            id: SAVED_OBJECT_IDS.SEARCH,
            type: 'search',
            relationship: 'parent',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            managed: false,
          },
        ])
      );
    });
  }
);
