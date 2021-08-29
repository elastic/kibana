/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { configServiceMock } from './config/mocks';
import { contextServiceMock } from './context/context_service.mock';
import { deprecationsServiceMock } from './deprecations/deprecations_service.mock';
import { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
import { environmentServiceMock } from './environment/environment_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { i18nServiceMock } from './i18n/i18n_service.mock';
import { legacyServiceMock } from './legacy/legacy_service.mock';
import { loggingServiceMock } from './logging/logging_service.mock';
import { metricsServiceMock } from './metrics/metrics_service.mock';
import { pluginServiceMock } from './plugins/plugins_service.mock';
import { prebootServiceMock } from './preboot/preboot_service.mock';
import { mockRenderingService, RenderingService } from './rendering/__mocks__/rendering_service';
import { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';
import { statusServiceMock } from './status/status_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';

export const mockHttpService = httpServiceMock.create();
jest.doMock('./http/http_service', () => ({
  HttpService: jest.fn(() => mockHttpService),
}));
export const mockPluginsService = pluginServiceMock.create();
jest.doMock('./plugins/plugins_service', () => ({
  PluginsService: jest.fn(() => mockPluginsService),
}));
export const mockElasticsearchService = elasticsearchServiceMock.create();
jest.doMock('./elasticsearch/elasticsearch_service', () => ({
  ElasticsearchService: jest.fn(() => mockElasticsearchService),
}));
export const mockLegacyService = legacyServiceMock.create();
jest.mock('./legacy/legacy_service', () => ({
  LegacyService: jest.fn(() => mockLegacyService),
}));

const realKbnConfig = jest.requireActual('@kbn/config');
export const mockConfigService = configServiceMock.create();
jest.doMock('@kbn/config', () => ({
  ...realKbnConfig,
  ConfigService: jest.fn(() => mockConfigService),
}));
export const mockSavedObjectsService = savedObjectsServiceMock.create();
jest.doMock('./saved_objects/saved_objects_service', () => ({
  SavedObjectsService: jest.fn(() => mockSavedObjectsService),
}));
export const mockContextService = contextServiceMock.create();
jest.doMock('./context/context_service', () => ({
  ContextService: jest.fn(() => mockContextService),
}));
export const mockUiSettingsService = uiSettingsServiceMock.create();
jest.doMock('./ui_settings/ui_settings_service', () => ({
  UiSettingsService: jest.fn(() => mockUiSettingsService),
}));

export const mockEnsureValidConfiguration = jest.fn();
jest.doMock('./config/ensure_valid_configuration', () => ({
  ensureValidConfiguration: mockEnsureValidConfiguration,
}));
jest.doMock('./rendering/rendering_service', () => ({ RenderingService }));
export const mockEnvironmentService = environmentServiceMock.create();
jest.doMock('./environment/environment_service', () => ({
  EnvironmentService: jest.fn(() => mockEnvironmentService),
}));
export const mockMetricsService = metricsServiceMock.create();
jest.doMock('./metrics/metrics_service', () => ({
  MetricsService: jest.fn(() => mockMetricsService),
}));
export const mockStatusService = statusServiceMock.create();
jest.doMock('./status/status_service', () => ({
  StatusService: jest.fn(() => mockStatusService),
}));
export const mockLoggingService = loggingServiceMock.create();
jest.doMock('./logging/logging_service', () => ({
  LoggingService: jest.fn(() => mockLoggingService),
}));
export const mockI18nService = i18nServiceMock.create();
jest.doMock('./i18n/i18n_service', () => ({
  I18nService: jest.fn(() => mockI18nService),
}));
export const mockPrebootService = prebootServiceMock.create();
jest.doMock('./preboot/preboot_service', () => ({
  PrebootService: jest.fn(() => mockPrebootService),
}));
export const mockDeprecationService = deprecationsServiceMock.create();
jest.doMock('./deprecations/deprecations_service', () => ({
  DeprecationsService: jest.fn(() => mockDeprecationService),
}));
export { mockRenderingService };
