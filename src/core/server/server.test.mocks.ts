/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '@kbn/core-http-server-mocks';

export const mockHttpService = httpServiceMock.create();
jest.doMock('@kbn/core-http-server-internal', () => ({
  HttpService: jest.fn(() => mockHttpService),
}));

import { pluginServiceMock } from './plugins/plugins_service.mock';

export const mockPluginsService = pluginServiceMock.create();
jest.doMock('./plugins/plugins_service', () => ({
  PluginsService: jest.fn(() => mockPluginsService),
}));

import { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';

export const mockElasticsearchService = elasticsearchServiceMock.create();
jest.doMock('./elasticsearch/elasticsearch_service', () => ({
  ElasticsearchService: jest.fn(() => mockElasticsearchService),
}));

const realKbnConfig = jest.requireActual('@kbn/config');

import { configServiceMock } from '@kbn/config-mocks';

export const mockConfigService = configServiceMock.create();
jest.doMock('@kbn/config', () => ({
  ...realKbnConfig,
  ConfigService: jest.fn(() => mockConfigService),
}));

import { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';

export const mockSavedObjectsService = savedObjectsServiceMock.create();
jest.doMock('./saved_objects/saved_objects_service', () => ({
  SavedObjectsService: jest.fn(() => mockSavedObjectsService),
}));

import { contextServiceMock } from '@kbn/core-http-context-server-mocks';

export const mockContextService = contextServiceMock.create();
jest.doMock('@kbn/core-http-context-server-internal', () => ({
  ContextService: jest.fn(() => mockContextService),
}));

import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';

export const mockUiSettingsService = uiSettingsServiceMock.create();
jest.doMock('./ui_settings/ui_settings_service', () => ({
  UiSettingsService: jest.fn(() => mockUiSettingsService),
}));

export const mockEnsureValidConfiguration = jest.fn();
jest.doMock('@kbn/core-config-server-internal', () => ({
  ensureValidConfiguration: mockEnsureValidConfiguration,
}));

import { RenderingService, mockRenderingService } from './rendering/__mocks__/rendering_service';

export { mockRenderingService };
jest.doMock('./rendering/rendering_service', () => ({ RenderingService }));

import { environmentServiceMock } from '@kbn/core-environment-server-mocks';

export const mockEnvironmentService = environmentServiceMock.create();
jest.doMock('@kbn/core-environment-server-internal', () => ({
  EnvironmentService: jest.fn(() => mockEnvironmentService),
}));

import { nodeServiceMock } from '@kbn/core-node-server-mocks';

export const mockNodeService = nodeServiceMock.create();
jest.doMock('@kbn/core-node-server-internal', () => ({
  NodeService: jest.fn(() => mockNodeService),
}));

import { metricsServiceMock } from './metrics/metrics_service.mock';

export const mockMetricsService = metricsServiceMock.create();
jest.doMock('./metrics/metrics_service', () => ({
  MetricsService: jest.fn(() => mockMetricsService),
}));

import { statusServiceMock } from './status/status_service.mock';

export const mockStatusService = statusServiceMock.create();
jest.doMock('./status/status_service', () => ({
  StatusService: jest.fn(() => mockStatusService),
}));

import { loggingServiceMock } from '@kbn/core-logging-server-mocks';

export const mockLoggingService = loggingServiceMock.create();
jest.doMock('@kbn/core-logging-server-internal', () => ({
  LoggingService: jest.fn(() => mockLoggingService),
}));

import { i18nServiceMock } from './i18n/i18n_service.mock';

export const mockI18nService = i18nServiceMock.create();
jest.doMock('./i18n/i18n_service', () => ({
  I18nService: jest.fn(() => mockI18nService),
}));

import { prebootServiceMock } from '@kbn/core-preboot-server-mocks';

export const mockPrebootService = prebootServiceMock.create();
jest.doMock('@kbn/core-preboot-server-internal', () => ({
  PrebootService: jest.fn(() => mockPrebootService),
}));

import { deprecationsServiceMock } from './deprecations/deprecations_service.mock';

export const mockDeprecationService = deprecationsServiceMock.create();
jest.doMock('./deprecations/deprecations_service', () => ({
  DeprecationsService: jest.fn(() => mockDeprecationService),
}));

import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';

export const mockDocLinksService = docLinksServiceMock.create();
jest.doMock('@kbn/core-doc-links-server-internal', () => ({
  DocLinksService: jest.fn(() => mockDocLinksService),
}));
