/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMemoryHistory } from 'history';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';

// Only import types from '.' to avoid triggering default Jest mocks.
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { PluginInitializerContext, AppMountParameters } from '.';
// Import values from their individual modules instead.
import { ScopedHistory } from './application';
import { applicationServiceMock } from './application/application_service.mock';
import { chromeServiceMock } from './chrome/chrome_service.mock';
import { fatalErrorsServiceMock } from './fatal_errors/fatal_errors_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { notificationServiceMock } from './notifications/notifications_service.mock';
import { overlayServiceMock } from './overlays/overlay_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
import { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';
import { deprecationsServiceMock } from './deprecations/deprecations_service.mock';
import { executionContextServiceMock } from './execution_context/execution_context_service.mock';

export { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
export { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
export { themeServiceMock } from '@kbn/core-theme-browser-mocks';
export { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
export { chromeServiceMock } from './chrome/chrome_service.mock';
export { executionContextServiceMock } from './execution_context/execution_context_service.mock';
export { fatalErrorsServiceMock } from './fatal_errors/fatal_errors_service.mock';
export { httpServiceMock } from './http/http_service.mock';
export { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
export { notificationServiceMock } from './notifications/notifications_service.mock';
export { overlayServiceMock } from './overlays/overlay_service.mock';
export { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
export { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';
export { scopedHistoryMock } from './application/scoped_history.mock';
export { applicationServiceMock } from './application/application_service.mock';
export { deprecationsServiceMock } from './deprecations/deprecations_service.mock';

function createCoreSetupMock({
  basePath = '',
  pluginStartDeps = {},
  pluginStartContract,
}: {
  basePath?: string;
  pluginStartDeps?: object;
  pluginStartContract?: any;
} = {}) {
  const mock = {
    analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
    application: applicationServiceMock.createSetupContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
    executionContext: executionContextServiceMock.createSetupContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
    getStartServices: jest.fn<Promise<[ReturnType<typeof createCoreStartMock>, any, any]>, []>(() =>
      Promise.resolve([createCoreStartMock({ basePath }), pluginStartDeps, pluginStartContract])
    ),
    http: httpServiceMock.createSetupContract({ basePath }),
    notifications: notificationServiceMock.createSetupContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    deprecations: deprecationsServiceMock.createSetupContract(),
    injectedMetadata: {
      getInjectedVar: injectedMetadataServiceMock.createSetupContract().getInjectedVar,
    },
    theme: themeServiceMock.createSetupContract(),
  };

  return mock;
}

function createCoreStartMock({ basePath = '' } = {}) {
  const mock = {
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    application: applicationServiceMock.createStartContract(),
    chrome: chromeServiceMock.createStartContract(),
    docLinks: docLinksServiceMock.createStartContract(),
    executionContext: executionContextServiceMock.createStartContract(),
    http: httpServiceMock.createStartContract({ basePath }),
    i18n: i18nServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    overlays: overlayServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    deprecations: deprecationsServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    injectedMetadata: {
      getInjectedVar: injectedMetadataServiceMock.createStartContract().getInjectedVar,
    },
    fatalErrors: fatalErrorsServiceMock.createStartContract(),
  };

  return mock;
}

function pluginInitializerContextMock(config: any = {}) {
  const mock: PluginInitializerContext = {
    opaqueId: Symbol(),
    env: {
      mode: {
        dev: true,
        name: 'development',
        prod: false,
      },
      packageInfo: {
        version: 'version',
        branch: 'branch',
        buildNum: 100,
        buildSha: 'buildSha',
        dist: false,
      },
    },
    config: {
      get: <T>() => config as T,
    },
  };

  return mock;
}

function createStorageMock() {
  const storageMock: jest.Mocked<Storage> = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 10,
  };
  return storageMock;
}

function createAppMountParametersMock(appBasePath = '') {
  // Assemble an in-memory history mock using the provided basePath
  const rawHistory = createMemoryHistory();
  rawHistory.push(appBasePath);
  const history = new ScopedHistory(rawHistory, appBasePath);

  const params: jest.Mocked<AppMountParameters> = {
    appBasePath,
    element: document.createElement('div'),
    history,
    theme$: themeServiceMock.createTheme$(),
    onAppLeave: jest.fn(),
    setHeaderActionMenu: jest.fn(),
  };

  return params;
}

export const coreMock = {
  createCoreContext: coreContextMock.create,
  createSetup: createCoreSetupMock,
  createStart: createCoreStartMock,
  createPluginInitializerContext: pluginInitializerContextMock,
  createStorage: createStorageMock,
  createAppMountParameters: createAppMountParametersMock,
};
