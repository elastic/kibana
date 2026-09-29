/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { pluginServiceMock } from '@kbn/core-plugins-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { configServiceMock } from '@kbn/config-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-server-mocks';
import { environmentServiceMock } from '@kbn/core-environment-server-mocks';
import { nodeServiceMock } from '@kbn/core-node-server-mocks';
import { metricsServiceMock } from '@kbn/core-metrics-server-mocks';
import { statusServiceMock } from '@kbn/core-status-server-mocks';
import { loggingServiceMock } from '@kbn/core-logging-server-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-server-mocks';
import { prebootServiceMock } from '@kbn/core-preboot-server-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { userSettingsServiceMock } from '@kbn/core-user-settings-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { injectionServiceMock } from '@kbn/core-di-mocks';

export const mockHttpService = httpServiceMock.create();
vi.doMock('@kbn/core-http-server-internal', () => {
      const mocked = {
      HttpService: vi.fn(() => mockHttpService),
    };
      return { ...mocked, default: mocked };
    });

export const mockPluginsService = pluginServiceMock.create();
vi.doMock('@kbn/core-plugins-server-internal', () => {
      const mocked = {
      PluginsService: vi.fn(() => mockPluginsService),
    };
      return { ...mocked, default: mocked };
    });

export const mockElasticsearchService = elasticsearchServiceMock.create();
vi.doMock('@kbn/core-elasticsearch-server-internal', () => {
      const mocked = {
      ElasticsearchService: vi.fn(() => mockElasticsearchService),
    };
      return { ...mocked, default: mocked };
    });

export const mockConfigService = configServiceMock.create();
vi.doMock('@kbn/config', async () => {
  const realKbnConfig = (await vi.importActual('@kbn/config'));
  return {
    ...realKbnConfig,
    ConfigService: vi.fn(() => mockConfigService),
  };
});

export const mockSavedObjectsService = savedObjectsServiceMock.create();
vi.doMock('@kbn/core-saved-objects-server-internal', () => {
      const mocked = {
      SavedObjectsService: vi.fn(() => mockSavedObjectsService),
    };
      return { ...mocked, default: mocked };
    });

import { contextServiceMock } from '@kbn/core-http-context-server-mocks';

export const mockContextService = contextServiceMock.create();
vi.doMock('@kbn/core-http-context-server-internal', () => {
      const mocked = {
      ContextService: vi.fn(() => mockContextService),
    };
      return { ...mocked, default: mocked };
    });

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';

export const mockUiSettingsService = uiSettingsServiceMock.create();
vi.doMock('@kbn/core-ui-settings-server-internal', () => {
      const mocked = {
      UiSettingsService: vi.fn(() => mockUiSettingsService),
    };
      return { ...mocked, default: mocked };
    });

import { customBrandingServiceMock } from '@kbn/core-custom-branding-server-mocks';
import { coreUsageDataServiceMock } from '@kbn/core-usage-data-server-mocks';

export const mockCustomBrandingService = customBrandingServiceMock.create();
vi.doMock('@kbn/core-custom-branding-server-internal', () => {
      const mocked = {
      CustomBrandingService: vi.fn(() => mockCustomBrandingService),
    };
      return { ...mocked, default: mocked };
    });

export const mockUserSettingsService = userSettingsServiceMock.create();
vi.doMock('@kbn/core-user-settings-server-internal', () => {
      const mocked = {
      UserSettingsService: vi.fn(() => mockUserSettingsService),
    };
      return { ...mocked, default: mocked };
    });

export const mockEnsureValidConfiguration = vi.fn();
vi.doMock('@kbn/core-config-server-internal', () => {
      const mocked = {
      ensureValidConfiguration: mockEnsureValidConfiguration,
    };
      return { ...mocked, default: mocked };
    });

export const mockRenderingService = renderingServiceMock.create();
vi.doMock('@kbn/core-rendering-server-internal', () => {
      const mocked = {
      RenderingService: vi.fn(() => mockRenderingService),
    };
      return { ...mocked, default: mocked };
    });

export const mockEnvironmentService = environmentServiceMock.create();
vi.doMock('@kbn/core-environment-server-internal', () => {
      const mocked = {
      EnvironmentService: vi.fn(() => mockEnvironmentService),
    };
      return { ...mocked, default: mocked };
    });

export const mockNodeService = nodeServiceMock.create();
vi.doMock('@kbn/core-node-server-internal', () => {
      const mocked = {
      NodeService: vi.fn(() => mockNodeService),
    };
      return { ...mocked, default: mocked };
    });

export const mockMetricsService = metricsServiceMock.create();
vi.doMock('@kbn/core-metrics-server-internal', () => {
      const mocked = {
      MetricsService: vi.fn(() => mockMetricsService),
    };
      return { ...mocked, default: mocked };
    });

export const mockStatusService = statusServiceMock.create();
vi.doMock('@kbn/core-status-server-internal', () => {
      const mocked = {
      StatusService: vi.fn(() => mockStatusService),
    };
      return { ...mocked, default: mocked };
    });

export const mockLoggingService = loggingServiceMock.create();
vi.doMock('@kbn/core-logging-server-internal', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/core-logging-server-internal')),
      LoggingService: vi.fn(() => mockLoggingService),
    };
      return { ...mocked, default: mocked };
    });

export const mockI18nService = i18nServiceMock.create();
vi.doMock('@kbn/core-i18n-server-internal', () => {
      const mocked = {
      I18nService: vi.fn(() => mockI18nService),
    };
      return { ...mocked, default: mocked };
    });

export const mockPrebootService = prebootServiceMock.create();
vi.doMock('@kbn/core-preboot-server-internal', () => {
      const mocked = {
      PrebootService: vi.fn(() => mockPrebootService),
    };
      return { ...mocked, default: mocked };
    });

export const mockDeprecationService = deprecationsServiceMock.create();
vi.doMock('@kbn/core-deprecations-server-internal', () => {
      const mocked = {
      DeprecationsService: vi.fn(() => mockDeprecationService),
    };
      return { ...mocked, default: mocked };
    });

export const mockDocLinksService = docLinksServiceMock.create();
vi.doMock('@kbn/core-doc-links-server-internal', () => {
      const mocked = {
      DocLinksService: vi.fn(() => mockDocLinksService),
    };
      return { ...mocked, default: mocked };
    });

export const mockSecurityService = securityServiceMock.create();
vi.doMock('@kbn/core-security-server-internal', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/core-security-server-internal')),
      SecurityService: vi.fn(() => mockSecurityService),
    };
      return { ...mocked, default: mocked };
    });

export const mockUserProfileService = userProfileServiceMock.create();
vi.doMock('@kbn/core-user-profile-server-internal', () => {
      const mocked = {
      UserProfileService: vi.fn(() => mockUserProfileService),
    };
      return { ...mocked, default: mocked };
    });

export const mockUsageDataService = coreUsageDataServiceMock.create();
vi.doMock('@kbn/core-usage-data-server-internal', () => {
      const mocked = {
      CoreUsageDataService: vi.fn(() => mockUsageDataService),
    };
      return { ...mocked, default: mocked };
    });

export const mockInjectionService = injectionServiceMock.create();
vi.doMock('@kbn/core-di-internal', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/core-di-internal')),
      CoreInjectionService: vi.fn(() => mockInjectionService),
    };
      return { ...mocked, default: mocked };
    });
