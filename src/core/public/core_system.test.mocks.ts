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
import { fatalErrorsServiceMock } from './fatal_errors/fatal_errors_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { i18nServiceMock } from './i18n/i18n_service.mock';
import { injectedMetadataServiceMock } from './injected_metadata/injected_metadata_service.mock';
import { legacyPlatformServiceMock } from './legacy/legacy_service.mock';
import { notificationServiceMock } from './notifications/notifications_service.mock';
import { overlayServiceMock } from './overlays/overlay_service.mock';
import { pluginsServiceMock } from './plugins/plugins_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';

export const MockLegacyPlatformService = legacyPlatformServiceMock.create();
export const LegacyPlatformServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockLegacyPlatformService);
jest.doMock('./legacy', () => ({
  LegacyPlatformService: LegacyPlatformServiceConstructor,
}));

export const MockInjectedMetadataService = injectedMetadataServiceMock.create();
export const InjectedMetadataServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockInjectedMetadataService);
jest.doMock('./injected_metadata', () => ({
  InjectedMetadataService: InjectedMetadataServiceConstructor,
}));

export const MockFatalErrorsService = fatalErrorsServiceMock.create();
export const FatalErrorsServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockFatalErrorsService);
jest.doMock('./fatal_errors', () => ({
  FatalErrorsService: FatalErrorsServiceConstructor,
}));

export const MockI18nService = i18nServiceMock.create();
export const I18nServiceConstructor = jest.fn().mockImplementation(() => MockI18nService);
jest.doMock('./i18n', () => ({
  I18nService: I18nServiceConstructor,
}));

export const MockNotificationsService = notificationServiceMock.create();
export const NotificationServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockNotificationsService);
jest.doMock('./notifications', () => ({
  NotificationsService: NotificationServiceConstructor,
}));

export const MockHttpService = httpServiceMock.create();
export const HttpServiceConstructor = jest.fn().mockImplementation(() => MockHttpService);
jest.doMock('./http', () => ({
  HttpService: HttpServiceConstructor,
}));

export const MockUiSettingsService = uiSettingsServiceMock.create();
export const UiSettingsServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockUiSettingsService);
jest.doMock('./ui_settings', () => ({
  UiSettingsService: UiSettingsServiceConstructor,
}));

export const MockChromeService = chromeServiceMock.create();
export const ChromeServiceConstructor = jest.fn().mockImplementation(() => MockChromeService);
jest.doMock('./chrome', () => ({
  ChromeService: ChromeServiceConstructor,
}));

export const MockOverlayService = overlayServiceMock.create();
export const OverlayServiceConstructor = jest.fn().mockImplementation(() => MockOverlayService);
jest.doMock('./overlays', () => ({
  OverlayService: OverlayServiceConstructor,
}));

export const MockPluginsService = pluginsServiceMock.create();
export const PluginsServiceConstructor = jest.fn().mockImplementation(() => MockPluginsService);
jest.doMock('./plugins', () => ({
  PluginsService: PluginsServiceConstructor,
}));

export const MockApplicationService = applicationServiceMock.create();
export const ApplicationServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockApplicationService);
jest.doMock('./application', () => ({
  ApplicationService: ApplicationServiceConstructor,
}));
