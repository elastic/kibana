/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

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
import { securityServiceMock } from '@kbn/core-security-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { pricingServiceMock } from '@kbn/core-pricing-browser-mocks';
import { injectionServiceMock } from '@kbn/core-di-mocks';

export const analyticsServiceStartMock = analyticsServiceMock.createAnalyticsServiceStart();
export const MockAnalyticsService = analyticsServiceMock.create();
MockAnalyticsService.start.mockReturnValue(analyticsServiceStartMock);
export const AnalyticsServiceConstructor = vi.fn().mockReturnValue(MockAnalyticsService);
vi.doMock('@kbn/core-analytics-browser-internal', () => {
      const mocked = {
      AnalyticsService: AnalyticsServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const fetchOptionalMemoryInfoMock = vi.fn();
vi.doMock('./fetch_optional_memory_info', () => {
      const mocked = {
      fetchOptionalMemoryInfo: fetchOptionalMemoryInfoMock,
    };
      return { ...mocked, default: mocked };
    });

export const MockInjectedMetadataService = injectedMetadataServiceMock.create();
export const InjectedMetadataServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockInjectedMetadataService);
vi.doMock('@kbn/core-injected-metadata-browser-internal', () => {
      const mocked = {
      InjectedMetadataService: InjectedMetadataServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockFatalErrorsService = fatalErrorsServiceMock.create();
export const FatalErrorsServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockFatalErrorsService);
vi.doMock('@kbn/core-fatal-errors-browser-internal', () => {
      const mocked = {
      FatalErrorsService: FatalErrorsServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockI18nService = i18nServiceMock.create();
export const I18nServiceConstructor = vi.fn().mockImplementation(() => MockI18nService);
vi.doMock('@kbn/core-i18n-browser-internal', () => {
      const mocked = {
      I18nService: I18nServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockNotificationsService = notificationServiceMock.create();
export const NotificationServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockNotificationsService);
vi.doMock('@kbn/core-notifications-browser-internal', () => {
      const mocked = {
      NotificationsService: NotificationServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockHttpService = httpServiceMock.create();
export const HttpServiceConstructor = vi.fn().mockImplementation(() => MockHttpService);
vi.doMock('@kbn/core-http-browser-internal', () => {
      const mocked = {
      HttpService: HttpServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockUiSettingsService = uiSettingsServiceMock.create();
export const UiSettingsServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockUiSettingsService);
export const MockSettingsService = settingsServiceMock.create();
export const SettingsServiceConstructor = vi.fn().mockImplementation(() => MockSettingsService);
vi.doMock('@kbn/core-ui-settings-browser-internal', () => {
      const mocked = {
      UiSettingsService: UiSettingsServiceConstructor,
      SettingsService: SettingsServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockCustomBrandingService = customBrandingServiceMock.create();
export const CustomBrandingServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockCustomBrandingService);
vi.doMock('@kbn/core-custom-branding-browser-internal', () => {
      const mocked = {
      CustomBrandingService: CustomBrandingServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });
export const MockChromeService = chromeServiceMock.create();
export const ChromeServiceConstructor = vi.fn().mockImplementation(() => MockChromeService);
vi.doMock('@kbn/core-chrome-browser-internal', () => {
      const mocked = {
      ChromeService: ChromeServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockOverlayService = overlayServiceMock.create();
export const OverlayServiceConstructor = vi.fn().mockImplementation(() => MockOverlayService);
vi.doMock('@kbn/core-overlays-browser-internal', () => {
      const mocked = {
      OverlayService: OverlayServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockPluginsService = pluginsServiceMock.create();
export const PluginsServiceConstructor = vi.fn().mockImplementation(() => MockPluginsService);
vi.doMock('@kbn/core-plugins-browser-internal', () => {
      const mocked = {
      PluginsService: PluginsServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockApplicationService = applicationServiceMock.create();
export const ApplicationServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockApplicationService);
vi.doMock('@kbn/core-application-browser-internal', () => {
      const mocked = {
      ApplicationService: ApplicationServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockDocLinksService = docLinksServiceMock.create();
export const DocLinksServiceConstructor = vi.fn().mockImplementation(() => MockDocLinksService);
vi.doMock('@kbn/core-doc-links-browser-internal', () => {
      const mocked = {
      DocLinksService: DocLinksServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockRenderingService = renderingServiceMock.createInternal();
export const RenderingServiceConstructor = vi.fn().mockImplementation(() => MockRenderingService);
vi.doMock('@kbn/core-rendering-browser-internal', () => {
      const mocked = {
      RenderingService: RenderingServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockIntegrationsService = integrationsServiceMock.create();
export const IntegrationsServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockIntegrationsService);
vi.doMock('@kbn/core-integrations-browser-internal', () => {
      const mocked = {
      IntegrationsService: IntegrationsServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockCoreApp = coreAppsMock.create();
export const CoreAppConstructor = vi.fn().mockImplementation(() => MockCoreApp);
vi.doMock('@kbn/core-apps-browser-internal', () => {
      const mocked = {
      CoreAppsService: CoreAppConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockThemeService = themeServiceMock.create();
export const ThemeServiceConstructor = vi.fn().mockImplementation(() => MockThemeService);
vi.doMock('@kbn/core-theme-browser-internal', () => {
      const mocked = {
      ThemeService: ThemeServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockLoggingSystem = loggingSystemMock.create();
export const LoggingSystemConstructor = vi.fn().mockImplementation(() => MockLoggingSystem);
vi.doMock('@kbn/core-logging-browser-internal', () => {
      const mocked = {
      BrowserLoggingSystem: LoggingSystemConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockSecurityService = securityServiceMock.create();
export const SecurityServiceConstructor = vi.fn().mockImplementation(() => MockSecurityService);
vi.doMock('@kbn/core-security-browser-internal', () => {
      const mocked = {
      SecurityService: SecurityServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockUserProfileService = userProfileServiceMock.create();
export const UserProfileServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockUserProfileService);
vi.doMock('@kbn/core-user-profile-browser-internal', () => {
      const mocked = {
      UserProfileService: UserProfileServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockPricingService = pricingServiceMock.create();
export const PricingServiceConstructor = vi.fn().mockImplementation(() => MockPricingService);
vi.doMock('@kbn/core-pricing-browser-internal', () => {
      const mocked = {
      PricingService: PricingServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const MockCoreInjectionService = injectionServiceMock.create();
export const CoreInjectionServiceConstructor = vi.fn(() => MockCoreInjectionService);
vi.doMock('@kbn/core-di-internal', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/core-di-internal')),
      CoreInjectionService: CoreInjectionServiceConstructor,
    };
      return { ...mocked, default: mocked };
    });
