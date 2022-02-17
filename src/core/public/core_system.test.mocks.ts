/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { applicationServiceMock } from './application/application_service.mock';
import { chromeServiceMock } from './chrome/chrome_service.mock';
import { fatalErrorsServiceMock } from './fatal_errors/fatal_errors_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { i18nServiceMock } from './i18n/i18n_service.mock';
import { injectedMetadataServiceMock } from './injected_metadata/injected_metadata_service.mock';
import { notificationServiceMock } from './notifications/notifications_service.mock';
import { overlayServiceMock } from './overlays/overlay_service.mock';
import { pluginsServiceMock } from './plugins/plugins_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
import { docLinksServiceMock } from './doc_links/doc_links_service.mock';
import { renderingServiceMock } from './rendering/rendering_service.mock';
import { integrationsServiceMock } from './integrations/integrations_service.mock';
import { coreAppMock } from './core_app/core_app.mock';
import { themeServiceMock } from './theme/theme_service.mock';

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

export const MockDocLinksService = docLinksServiceMock.create();
export const DocLinksServiceConstructor = jest.fn().mockImplementation(() => MockDocLinksService);
jest.doMock('./doc_links', () => ({
  DocLinksService: DocLinksServiceConstructor,
}));

export const MockRenderingService = renderingServiceMock.create();
export const RenderingServiceConstructor = jest.fn().mockImplementation(() => MockRenderingService);
jest.doMock('./rendering', () => ({
  RenderingService: RenderingServiceConstructor,
}));

export const MockIntegrationsService = integrationsServiceMock.create();
export const IntegrationsServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockIntegrationsService);
jest.doMock('./integrations', () => ({
  IntegrationsService: IntegrationsServiceConstructor,
}));

export const MockCoreApp = coreAppMock.create();
export const CoreAppConstructor = jest.fn().mockImplementation(() => MockCoreApp);
jest.doMock('./core_app', () => ({
  CoreApp: CoreAppConstructor,
}));

export const MockThemeService = themeServiceMock.create();
export const ThemeServiceConstructor = jest.fn().mockImplementation(() => MockThemeService);
jest.doMock('./theme', () => ({
  ThemeService: ThemeServiceConstructor,
}));
