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
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { fatalErrorsServiceMock } from '@kbn/core-fatal-errors-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { CoreScopedHistory } from '@kbn/core-application-browser-internal';
import type { AppMountParameters } from '@kbn/core-application-browser';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { PluginInitializerContext } from '.';

export { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
export { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
export { themeServiceMock } from '@kbn/core-theme-browser-mocks';
export { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
export { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
export { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
export { fatalErrorsServiceMock } from '@kbn/core-fatal-errors-browser-mocks';
export { httpServiceMock } from '@kbn/core-http-browser-mocks';
export { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
export { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
export { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
export { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
export {
  savedObjectsServiceMock,
  simpleSavedObjectMock,
} from '@kbn/core-saved-objects-browser-mocks';
export { applicationServiceMock, scopedHistoryMock } from '@kbn/core-application-browser-mocks';
export { deprecationsServiceMock } from '@kbn/core-deprecations-browser-mocks';

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
  const history = new CoreScopedHistory(rawHistory, appBasePath);

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
