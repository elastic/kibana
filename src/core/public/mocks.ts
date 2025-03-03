/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMemoryHistory } from 'history';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import { CoreScopedHistory } from '@kbn/core-application-browser-internal';
import type { AppMountParameters } from '@kbn/core-application-browser';
import { pluginsServiceMock } from '@kbn/core-plugins-browser-mocks';
import { coreLifecycleMock } from '@kbn/core-lifecycle-browser-mocks';

export { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
export { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
export { themeServiceMock } from '@kbn/core-theme-browser-mocks';
export { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
export { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
export { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
export { coreFeatureFlagsMock } from '@kbn/core-feature-flags-browser-mocks';
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
export { loggingSystemMock } from '@kbn/core-logging-browser-mocks';
export { securityServiceMock } from '@kbn/core-security-browser-mocks';

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
  createSetup: coreLifecycleMock.createCoreSetup,
  createStart: coreLifecycleMock.createCoreStart,
  createPluginInitializerContext: pluginsServiceMock.createPluginInitializerContext,
  createStorage: createStorageMock,
  createAppMountParameters: createAppMountParametersMock,
};
