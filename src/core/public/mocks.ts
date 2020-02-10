/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { applicationServiceMock } from './application/application_service.mock';
import { chromeServiceMock } from './chrome/chrome_service.mock';
import { CoreContext, PluginInitializerContext } from '.';
import { docLinksServiceMock } from './doc_links/doc_links_service.mock';
import { fatalErrorsServiceMock } from './fatal_errors/fatal_errors_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { i18nServiceMock } from './i18n/i18n_service.mock';
import { notificationServiceMock } from './notifications/notifications_service.mock';
import { overlayServiceMock } from './overlays/overlay_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
import { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';
import { contextServiceMock } from './context/context_service.mock';
import { injectedMetadataServiceMock } from './injected_metadata/injected_metadata_service.mock';

export { chromeServiceMock } from './chrome/chrome_service.mock';
export { docLinksServiceMock } from './doc_links/doc_links_service.mock';
export { fatalErrorsServiceMock } from './fatal_errors/fatal_errors_service.mock';
export { httpServiceMock } from './http/http_service.mock';
export { i18nServiceMock } from './i18n/i18n_service.mock';
export { injectedMetadataServiceMock } from './injected_metadata/injected_metadata_service.mock';
export { legacyPlatformServiceMock } from './legacy/legacy_service.mock';
export { notificationServiceMock } from './notifications/notifications_service.mock';
export { overlayServiceMock } from './overlays/overlay_service.mock';
export { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
export { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';

function createCoreSetupMock({ basePath = '' } = {}) {
  const mock = {
    application: applicationServiceMock.createSetupContract(),
    context: contextServiceMock.createSetupContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
    getStartServices: jest.fn<Promise<[ReturnType<typeof createCoreStartMock>, object]>, []>(() =>
      Promise.resolve([createCoreStartMock({ basePath }), {}])
    ),
    http: httpServiceMock.createSetupContract({ basePath }),
    notifications: notificationServiceMock.createSetupContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    injectedMetadata: {
      getInjectedVar: injectedMetadataServiceMock.createSetupContract().getInjectedVar,
    },
  };

  return mock;
}

function createCoreStartMock({ basePath = '' } = {}) {
  const mock = {
    application: applicationServiceMock.createStartContract(),
    chrome: chromeServiceMock.createStartContract(),
    docLinks: docLinksServiceMock.createStartContract(),
    http: httpServiceMock.createStartContract({ basePath }),
    i18n: i18nServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    overlays: overlayServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    injectedMetadata: {
      getInjectedVar: injectedMetadataServiceMock.createStartContract().getInjectedVar,
    },
    fatalErrors: fatalErrorsServiceMock.createStartContract(),
  };

  return mock;
}

function pluginInitializerContextMock() {
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
      get: <T>() => ({} as T),
    },
  };

  return mock;
}

function createCoreContext(): CoreContext {
  return {
    coreId: Symbol('core context mock'),
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
  };
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

export const coreMock = {
  createCoreContext,
  createSetup: createCoreSetupMock,
  createStart: createCoreStartMock,
  createPluginInitializerContext: pluginInitializerContextMock,
  createStorage: createStorageMock,
};
