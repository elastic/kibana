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
import { CoreSetup, CoreStart, PluginInitializerContext } from '.';
import { docLinksServiceMock } from './doc_links/doc_links_service.mock';
import { fatalErrorsServiceMock } from './fatal_errors/fatal_errors_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { i18nServiceMock } from './i18n/i18n_service.mock';
import { notificationServiceMock } from './notifications/notifications_service.mock';
import { overlayServiceMock } from './overlays/overlay_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
import { contextServiceMock } from './context/context_service.mock';

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

function createCoreSetupMock() {
  const mock: MockedKeys<CoreSetup> = {
    context: contextServiceMock.createSetupContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
    http: httpServiceMock.createSetupContract(),
    notifications: notificationServiceMock.createSetupContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
  };

  return mock;
}

function createCoreStartMock() {
  const mock: MockedKeys<CoreStart> = {
    application: applicationServiceMock.createStartContract(),
    chrome: chromeServiceMock.createStartContract(),
    docLinks: docLinksServiceMock.createStartContract(),
    http: httpServiceMock.createStartContract(),
    i18n: i18nServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    overlays: overlayServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
  };

  return mock;
}

export const coreMock = {
  createSetup: createCoreSetupMock,
  createStart: createCoreStartMock,
  createPluginInitializerContext: jest.fn() as jest.Mock<PluginInitializerContext>,
};
