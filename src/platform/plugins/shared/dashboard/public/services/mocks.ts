/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { serverlessMock } from '@kbn/serverless/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { indexPatternEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { noDataPagePublicMock } from '@kbn/no-data-page-plugin/public/mocks';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import { savedObjectsManagementPluginMock } from '@kbn/saved-objects-management-plugin/public/mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { savedObjectTaggingOssPluginMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { urlForwardingPluginMock } from '@kbn/url-forwarding-plugin/public/mocks';

import { setKibanaServices } from './kibana_services';
import { setLogger } from './logger';
import { DashboardAttributes } from '../../server/content_management';
import { DashboardCapabilities } from '../../common';
import { LoadDashboardReturn } from './dashboard_content_management_service/types';
import { SearchDashboardsResponse } from './dashboard_content_management_service/lib/find_dashboards';

const defaultDashboardCapabilities: DashboardCapabilities = {
  show: true,
  createNew: true,
  createShortUrl: true,
  showWriteControls: true,
  storeSearchSession: true,
};

export const setStubKibanaServices = () => {
  const core = coreMock.createStart();
  (core.application.capabilities as any).dashboard_v2 = defaultDashboardCapabilities;

  setKibanaServices(core, {
    contentManagement: contentManagementMock.createStartContract(),
    customBranding: customBrandingServiceMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
    dataViewEditor: indexPatternEditorPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    inspector: inspectorPluginMock.createStartContract(),
    navigation: navigationPluginMock.createStartContract(),
    noDataPage: noDataPagePublicMock.createStart(),
    observabilityAIAssistant: observabilityAIAssistantPluginMock.createStartContract(),
    presentationUtil: presentationUtilPluginMock.createStartContract(),
    savedObjectsManagement: savedObjectsManagementPluginMock.createStartContract(),
    savedObjectsTaggingOss: savedObjectTaggingOssPluginMock.createStart(),
    screenshotMode: screenshotModePluginMock.createStartContract(),
    serverless: serverlessMock.createStart(),
    share: sharePluginMock.createStartContract(),
    spaces: spacesPluginMock.createStartContract(),
    uiActions: uiActionsPluginMock.createStartContract(),
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    urlForwarding: urlForwardingPluginMock.createStartContract(),
    usageCollection: usageCollectionPluginMock.createSetupContract(),
  });
};

export const setStubLogger = () => {
  setLogger(coreMock.createCoreContext().logger);
};

export const mockDashboardContentManagementService = {
  loadDashboardState: jest.fn().mockImplementation(() =>
    Promise.resolve({
      dashboardInput: {},
    } as LoadDashboardReturn)
  ),
  saveDashboardState: jest.fn(),
  findDashboards: {
    search: jest.fn().mockImplementation(({ search, size }) => {
      const sizeToUse = size ?? 10;
      const hits: SearchDashboardsResponse['hits'] = [];
      for (let i = 0; i < sizeToUse; i++) {
        hits.push({
          type: 'dashboard',
          id: `dashboard${i}`,
          attributes: {
            description: `dashboard${i} desc`,
            title: `dashboard${i} - ${search} - title`,
          },
          references: [] as SearchDashboardsResponse['hits'][0]['references'],
        } as SearchDashboardsResponse['hits'][0]);
      }
      return Promise.resolve({
        total: sizeToUse,
        hits,
      });
    }),
    findById: jest.fn(),
    findByIds: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          id: `dashboardUnsavedOne`,
          status: 'success',
          attributes: {
            title: `Dashboard Unsaved One`,
          } as unknown as DashboardAttributes,
        },
        {
          id: `dashboardUnsavedTwo`,
          status: 'success',
          attributes: {
            title: `Dashboard Unsaved Two`,
          } as unknown as DashboardAttributes,
        },
        {
          id: `dashboardUnsavedThree`,
          status: 'success',
          attributes: {
            title: `Dashboard Unsaved Three`,
          } as unknown as DashboardAttributes,
        },
      ])
    ),
    findByTitle: jest.fn(),
  },
  deleteDashboards: jest.fn(),
  checkForDuplicateDashboardTitle: jest.fn(),
  updateDashboardMeta: jest.fn(),
};

export const mockDashboardBackupService = {
  clearState: jest.fn(),
  getState: jest.fn().mockReturnValue(undefined),
  setState: jest.fn(),
  getViewMode: jest.fn(),
  storeViewMode: jest.fn(),
  getDashboardIdsWithUnsavedChanges: jest
    .fn()
    .mockReturnValue(['dashboardUnsavedOne', 'dashboardUnsavedTwo']),
  dashboardHasUnsavedEdits: jest.fn(),
};

export const mockDashboardContentManagementCache = {
  fetchDashboard: jest.fn(),
  addDashboard: jest.fn(),
  deleteDashboard: jest.fn(),
};
