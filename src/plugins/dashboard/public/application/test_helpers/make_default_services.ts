/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { savedObjectsPluginMock } from '@kbn/saved-objects-plugin/public/mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { visualizationsPluginMock } from '@kbn/visualizations-plugin/public/mocks';
import { PluginInitializerContext, ScopedHistory } from '@kbn/core/public';
import { chromeServiceMock, coreMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { SavedObjectLoader, SavedObjectLoaderFindOptions } from '../../services/saved_objects';
import { DataViewsContract, SavedQueryService } from '../../services/data';
import { DashboardAppServices, DashboardAppCapabilities } from '../../types';
import { NavigationPublicPluginStart } from '../../services/navigation';
import { getSavedDashboardMock } from './get_saved_dashboard_mock';
import { DashboardSessionStorage } from '../lib';

export function makeDefaultServices(): DashboardAppServices {
  const core = coreMock.createStart();
  core.overlays.openConfirm = jest.fn().mockResolvedValue(true);

  const savedDashboards = {} as SavedObjectLoader;
  savedDashboards.find = (search: string, sizeOrOptions: number | SavedObjectLoaderFindOptions) => {
    const size = typeof sizeOrOptions === 'number' ? sizeOrOptions : sizeOrOptions.size ?? 10;
    const hits = [];
    for (let i = 0; i < size; i++) {
      hits.push({
        id: `dashboard${i}`,
        title: `dashboard${i} - ${search} - title`,
        description: `dashboard${i} desc`,
      });
    }
    return Promise.resolve({
      total: size,
      hits,
    });
  };
  savedDashboards.get = jest
    .fn()
    .mockImplementation((id?: string) => Promise.resolve(getSavedDashboardMock({ id })));

  const dashboardSessionStorage = {
    getDashboardIdsWithUnsavedChanges: jest
      .fn()
      .mockResolvedValue(['dashboardUnsavedOne', 'dashboardUnsavedTwo']),
    getState: jest.fn().mockReturnValue(undefined),
    setState: jest.fn(),
  } as unknown as DashboardSessionStorage;
  dashboardSessionStorage.clearState = jest.fn();

  const defaultCapabilities: DashboardAppCapabilities = {
    show: true,
    createNew: true,
    saveQuery: true,
    createShortUrl: true,
    showWriteControls: true,
    storeSearchSession: true,
    mapsCapabilities: { save: true },
    visualizeCapabilities: { save: true },
  };
  const initializerContext = {
    env: { packageInfo: { version: '8.0.0' } },
  } as PluginInitializerContext;

  return {
    screenshotModeService: screenshotModePluginMock.createSetupContract(),
    visualizations: visualizationsPluginMock.createStartContract(),
    savedObjects: savedObjectsPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createInstance().doStart(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    chrome: chromeServiceMock.createStartContract(),
    navigation: {} as NavigationPublicPluginStart,
    savedObjectsClient: core.savedObjects.client,
    dashboardCapabilities: defaultCapabilities,
    data: dataPluginMock.createStartContract(),
    dataViews: {} as DataViewsContract,
    savedQueryService: {} as SavedQueryService,
    scopedHistory: () => ({} as ScopedHistory),
    setHeaderActionMenu: (mountPoint) => {},
    urlForwarding: {} as UrlForwardingStart,
    allowByValueEmbeddables: true,
    restorePreviousUrl: () => {},
    onAppLeave: (handler) => {},
    dashboardSessionStorage,
    initializerContext,
    savedDashboards,
    core,
  };
}
