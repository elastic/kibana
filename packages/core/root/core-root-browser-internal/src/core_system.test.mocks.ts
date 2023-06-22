/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { fatalErrorsServiceMock } from '@kbn/core-fatal-errors-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { pluginsServiceMock } from '@kbn/core-plugins-browser-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { integrationsServiceMock } from '@kbn/core-integrations-browser-mocks';
import { coreAppsMock } from '@kbn/core-apps-browser-mocks';
import { loggingSystemMock } from '@kbn/core-logging-browser-mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';

export const analyticsServiceStartMock = analyticsServiceMock.createAnalyticsServiceStart();
export const MockAnalyticsService = analyticsServiceMock.create();
MockAnalyticsService.start.mockReturnValue(analyticsServiceStartMock);
export const AnalyticsServiceConstructor = jest.fn().mockReturnValue(MockAnalyticsService);
jest.doMock('@kbn/core-analytics-browser-internal', () => ({
  AnalyticsService: AnalyticsServiceConstructor,
}));

export const fetchOptionalMemoryInfoMock = jest.fn();
jest.doMock('./fetch_optional_memory_info', () => ({
  fetchOptionalMemoryInfo: fetchOptionalMemoryInfoMock,
}));

export const MockInjectedMetadataService = injectedMetadataServiceMock.create();
export const InjectedMetadataServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockInjectedMetadataService);
jest.doMock('@kbn/core-injected-metadata-browser-internal', () => ({
  InjectedMetadataService: InjectedMetadataServiceConstructor,
}));

export const MockFatalErrorsService = fatalErrorsServiceMock.create();
export const FatalErrorsServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockFatalErrorsService);
jest.doMock('@kbn/core-fatal-errors-browser-internal', () => ({
  FatalErrorsService: FatalErrorsServiceConstructor,
}));

export const MockI18nService = i18nServiceMock.create();
export const I18nServiceConstructor = jest.fn().mockImplementation(() => MockI18nService);
jest.doMock('@kbn/core-i18n-browser-internal', () => ({
  I18nService: I18nServiceConstructor,
}));

export const MockNotificationsService = notificationServiceMock.create();
export const NotificationServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockNotificationsService);
jest.doMock('@kbn/core-notifications-browser-internal', () => ({
  NotificationsService: NotificationServiceConstructor,
}));

export const MockHttpService = httpServiceMock.create();
export const HttpServiceConstructor = jest.fn().mockImplementation(() => MockHttpService);
jest.doMock('@kbn/core-http-browser-internal', () => ({
  HttpService: HttpServiceConstructor,
}));

export const MockUiSettingsService = uiSettingsServiceMock.create();
export const UiSettingsServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockUiSettingsService);
export const MockSettingsService = settingsServiceMock.create();
export const SettingsServiceConstructor = jest.fn().mockImplementation(() => MockSettingsService);
jest.doMock('@kbn/core-ui-settings-browser-internal', () => ({
  UiSettingsService: UiSettingsServiceConstructor,
  SettingsService: SettingsServiceConstructor,
}));

export const MockCustomBrandingService = customBrandingServiceMock.create();
export const CustomBrandingServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockCustomBrandingService);
jest.doMock('@kbn/core-custom-branding-browser-internal', () => ({
  CustomBrandingService: CustomBrandingServiceConstructor,
}));
export const MockChromeService = chromeServiceMock.create();
export const ChromeServiceConstructor = jest.fn().mockImplementation(() => MockChromeService);
jest.doMock('@kbn/core-chrome-browser-internal', () => ({
  ChromeService: ChromeServiceConstructor,
}));

export const MockOverlayService = overlayServiceMock.create();
export const OverlayServiceConstructor = jest.fn().mockImplementation(() => MockOverlayService);
jest.doMock('@kbn/core-overlays-browser-internal', () => ({
  OverlayService: OverlayServiceConstructor,
}));

export const MockPluginsService = pluginsServiceMock.create();
export const PluginsServiceConstructor = jest.fn().mockImplementation(() => MockPluginsService);
jest.doMock('@kbn/core-plugins-browser-internal', () => ({
  PluginsService: PluginsServiceConstructor,
}));

export const MockApplicationService = applicationServiceMock.create();
export const ApplicationServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockApplicationService);
jest.doMock('@kbn/core-application-browser-internal', () => ({
  ApplicationService: ApplicationServiceConstructor,
}));

export const MockDocLinksService = docLinksServiceMock.create();
export const DocLinksServiceConstructor = jest.fn().mockImplementation(() => MockDocLinksService);
jest.doMock('@kbn/core-doc-links-browser-internal', () => ({
  DocLinksService: DocLinksServiceConstructor,
}));

export const MockRenderingService = renderingServiceMock.create();
export const RenderingServiceConstructor = jest.fn().mockImplementation(() => MockRenderingService);
jest.doMock('@kbn/core-rendering-browser-internal', () => ({
  RenderingService: RenderingServiceConstructor,
}));

export const MockIntegrationsService = integrationsServiceMock.create();
export const IntegrationsServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockIntegrationsService);
jest.doMock('@kbn/core-integrations-browser-internal', () => ({
  IntegrationsService: IntegrationsServiceConstructor,
}));

export const MockCoreApp = coreAppsMock.create();
export const CoreAppConstructor = jest.fn().mockImplementation(() => MockCoreApp);
jest.doMock('@kbn/core-apps-browser-internal', () => ({
  CoreAppsService: CoreAppConstructor,
}));

export const MockThemeService = themeServiceMock.create();
export const ThemeServiceConstructor = jest.fn().mockImplementation(() => MockThemeService);
jest.doMock('@kbn/core-theme-browser-internal', () => ({
  ThemeService: ThemeServiceConstructor,
}));

export const MockLoggingSystem = loggingSystemMock.create();
export const LoggingSystemConstructor = jest.fn().mockImplementation(() => MockLoggingSystem);
jest.doMock('@kbn/core-logging-browser-internal', () => ({
  BrowserLoggingSystem: LoggingSystemConstructor,
}));
