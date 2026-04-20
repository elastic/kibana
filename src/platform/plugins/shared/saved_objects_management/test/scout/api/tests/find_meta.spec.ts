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
  'find - meta attributes injected properly',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKey('viewer');
      await kbnClient.importExport.load(KBN_ARCHIVES.SEARCH);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.SEARCH);
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest('should inject meta attributes for searches', async ({ apiClient }) => {
      const response = await apiClient.get(`${MANAGEMENT_API.FIND}?type=search`, {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects).toHaveLength(1);
      expect(response.body.saved_objects[0].meta).toStrictEqual({
        icon: 'discoverApp',
        title: 'OneRecord',
        hiddenType: false,
        inAppUrl: {
          path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
          uiCapabilitiesPath: 'discover_v2.show',
        },
        namespaceType: 'multiple-isolated',
      });
    });

    apiTest('should inject meta attributes for dashboards', async ({ apiClient }) => {
      const response = await apiClient.get(`${MANAGEMENT_API.FIND}?type=dashboard`, {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects).toHaveLength(1);
      expect(response.body.saved_objects[0].meta).toStrictEqual({
        icon: 'dashboardApp',
        title: 'Dashboard',
        hiddenType: false,
        inAppUrl: {
          path: '/app/dashboards#/view/b70c7ae0-3224-11e8-a572-ffca06da1357',
          uiCapabilitiesPath: 'dashboard_v2.show',
        },
        namespaceType: 'multiple-isolated',
      });
    });

    apiTest('should inject meta attributes for visualizations', async ({ apiClient }) => {
      const response = await apiClient.get(`${MANAGEMENT_API.FIND}?type=visualization`, {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects).toHaveLength(2);
      // inAppUrl is present in stateful but absent in serverless for visualizations
      expect(response.body.saved_objects[0].meta).toMatchObject({
        icon: 'visualizeApp',
        title: 'VisualizationFromSavedSearch',
        namespaceType: 'multiple-isolated',
        hiddenType: false,
      });
      expect(response.body.saved_objects[1].meta).toMatchObject({
        icon: 'visualizeApp',
        title: 'Visualization',
        namespaceType: 'multiple-isolated',
        hiddenType: false,
      });
    });

    apiTest('should inject meta attributes for index patterns', async ({ apiClient }) => {
      const response = await apiClient.get(`${MANAGEMENT_API.FIND}?type=index-pattern`, {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects).toHaveLength(1);
      expect(response.body.saved_objects[0].meta).toStrictEqual({
        icon: 'indexPatternApp',
        title: 'saved_objects*',
        hiddenType: false,
        editUrl: '/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
        inAppUrl: {
          path: '/app/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
          uiCapabilitiesPath: 'management.kibana.indexPatterns',
        },
        namespaceType: 'multiple',
      });
    });
  }
);
