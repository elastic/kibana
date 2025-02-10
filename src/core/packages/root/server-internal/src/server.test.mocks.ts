/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

export const mockHttpService = httpServiceMock.create();
jest.doMock('@kbn/core-http-server-internal', () => ({
  HttpService: jest.fn(() => mockHttpService),
}));

export const mockPluginsService = pluginServiceMock.create();
jest.doMock('@kbn/core-plugins-server-internal', () => ({
  PluginsService: jest.fn(() => mockPluginsService),
}));

export const mockElasticsearchService = elasticsearchServiceMock.create();
jest.doMock('@kbn/core-elasticsearch-server-internal', () => ({
  ElasticsearchService: jest.fn(() => mockElasticsearchService),
}));

export const mockConfigService = configServiceMock.create();
jest.doMock('@kbn/config', () => {
  const realKbnConfig = jest.requireActual('@kbn/config');
  return {
    ...realKbnConfig,
    ConfigService: jest.fn(() => mockConfigService),
  };
});

export const mockSavedObjectsService = savedObjectsServiceMock.create();
jest.doMock('@kbn/core-saved-objects-server-internal', () => ({
  SavedObjectsService: jest.fn(() => mockSavedObjectsService),
}));

import { contextServiceMock } from '@kbn/core-http-context-server-mocks';

export const mockContextService = contextServiceMock.create();
jest.doMock('@kbn/core-http-context-server-internal', () => ({
  ContextService: jest.fn(() => mockContextService),
}));

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';

export const mockUiSettingsService = uiSettingsServiceMock.create();
jest.doMock('@kbn/core-ui-settings-server-internal', () => ({
  UiSettingsService: jest.fn(() => mockUiSettingsService),
}));

import { customBrandingServiceMock } from '@kbn/core-custom-branding-server-mocks';
import { coreUsageDataServiceMock } from '@kbn/core-usage-data-server-mocks';

export const mockCustomBrandingService = customBrandingServiceMock.create();
jest.doMock('@kbn/core-custom-branding-server-internal', () => ({
  CustomBrandingService: jest.fn(() => mockCustomBrandingService),
}));

export const mockUserSettingsService = userSettingsServiceMock.create();
jest.doMock('@kbn/core-user-settings-server-internal', () => ({
  UserSettingsService: jest.fn(() => mockUserSettingsService),
}));

export const mockEnsureValidConfiguration = jest.fn();
jest.doMock('@kbn/core-config-server-internal', () => ({
  ensureValidConfiguration: mockEnsureValidConfiguration,
}));

export const mockRenderingService = renderingServiceMock.create();
jest.doMock('@kbn/core-rendering-server-internal', () => ({
  RenderingService: jest.fn(() => mockRenderingService),
}));

export const mockEnvironmentService = environmentServiceMock.create();
jest.doMock('@kbn/core-environment-server-internal', () => ({
  EnvironmentService: jest.fn(() => mockEnvironmentService),
}));

export const mockNodeService = nodeServiceMock.create();
jest.doMock('@kbn/core-node-server-internal', () => ({
  NodeService: jest.fn(() => mockNodeService),
}));

export const mockMetricsService = metricsServiceMock.create();
jest.doMock('@kbn/core-metrics-server-internal', () => ({
  MetricsService: jest.fn(() => mockMetricsService),
}));

export const mockStatusService = statusServiceMock.create();
jest.doMock('@kbn/core-status-server-internal', () => ({
  StatusService: jest.fn(() => mockStatusService),
}));

export const mockLoggingService = loggingServiceMock.create();
jest.doMock('@kbn/core-logging-server-internal', () => ({
  LoggingService: jest.fn(() => mockLoggingService),
}));

export const mockI18nService = i18nServiceMock.create();
jest.doMock('@kbn/core-i18n-server-internal', () => ({
  I18nService: jest.fn(() => mockI18nService),
}));

export const mockPrebootService = prebootServiceMock.create();
jest.doMock('@kbn/core-preboot-server-internal', () => ({
  PrebootService: jest.fn(() => mockPrebootService),
}));

export const mockDeprecationService = deprecationsServiceMock.create();
jest.doMock('@kbn/core-deprecations-server-internal', () => ({
  DeprecationsService: jest.fn(() => mockDeprecationService),
}));

export const mockDocLinksService = docLinksServiceMock.create();
jest.doMock('@kbn/core-doc-links-server-internal', () => ({
  DocLinksService: jest.fn(() => mockDocLinksService),
}));

export const mockSecurityService = securityServiceMock.create();
jest.doMock('@kbn/core-security-server-internal', () => ({
  SecurityService: jest.fn(() => mockSecurityService),
}));

export const mockUserProfileService = userProfileServiceMock.create();
jest.doMock('@kbn/core-user-profile-server-internal', () => ({
  UserProfileService: jest.fn(() => mockUserProfileService),
}));

export const mockUsageDataService = coreUsageDataServiceMock.create();
jest.doMock('@kbn/core-usage-data-server-internal', () => ({
  CoreUsageDataService: jest.fn(() => mockUsageDataService),
}));
