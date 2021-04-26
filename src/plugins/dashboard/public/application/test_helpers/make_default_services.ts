/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IUiSettingsClient,
  PluginInitializerContext,
  ScopedHistory,
} from '../../../../../core/public';

import { DashboardSessionStorage } from '../lib';
import { dataPluginMock } from '../../../../data/public/mocks';
import { UrlForwardingStart } from '../../../../url_forwarding/public';
import { NavigationPublicPluginStart } from '../../services/navigation';
import { DashboardAppServices, DashboardCapabilities } from '../../types';
import { embeddablePluginMock } from '../../../../embeddable/public/mocks';
import { chromeServiceMock, coreMock } from '../../../../../core/public/mocks';
import { IndexPatternsContract, SavedQueryService } from '../../services/data';
import { savedObjectsPluginMock } from '../../../../saved_objects/public/mocks';
import { SavedObjectLoader, SavedObjectLoaderFindOptions } from '../../services/saved_objects';

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
  const dashboardSessionStorage = ({
    getDashboardIdsWithUnsavedChanges: jest
      .fn()
      .mockResolvedValue(['dashboardUnsavedOne', 'dashboardUnsavedTwo']),
  } as unknown) as DashboardSessionStorage;
  dashboardSessionStorage.clearState = jest.fn();

  const defaultCapabilities: DashboardCapabilities = {
    show: true,
    createNew: true,
    saveQuery: true,
    createShortUrl: true,
    hideWriteControls: false,
    mapsCapabilities: { save: true },
    visualizeCapabilities: { save: true },
    storeSearchSession: true,
  };

  return {
    savedObjects: savedObjectsPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createInstance().doStart(),
    initializerContext: {} as PluginInitializerContext,
    chrome: chromeServiceMock.createStartContract(),
    navigation: {} as NavigationPublicPluginStart,
    savedObjectsClient: core.savedObjects.client,
    dashboardCapabilities: defaultCapabilities,
    data: dataPluginMock.createStartContract(),
    indexPatterns: {} as IndexPatternsContract,
    savedQueryService: {} as SavedQueryService,
    scopedHistory: () => ({} as ScopedHistory),
    setHeaderActionMenu: (mountPoint) => {},
    urlForwarding: {} as UrlForwardingStart,
    uiSettings: {} as IUiSettingsClient,
    allowByValueEmbeddables: true,
    restorePreviousUrl: () => {},
    onAppLeave: (handler) => {},
    dashboardSessionStorage,
    savedDashboards,
    core,
  };
}
