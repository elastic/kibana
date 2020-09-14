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

import { httpServiceMock } from './http/http_service.mock';
export const mockHttpService = httpServiceMock.create();
jest.doMock('./http/http_service', () => ({
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

import { legacyServiceMock } from './legacy/legacy_service.mock';
export const mockLegacyService = legacyServiceMock.create();
jest.mock('./legacy/legacy_service', () => ({
  LegacyService: jest.fn(() => mockLegacyService),
}));

import { configServiceMock } from './config/config_service.mock';
export const mockConfigService = configServiceMock.create();
jest.doMock('./config/config_service', () => ({
  ConfigService: jest.fn(() => mockConfigService),
}));

import { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';
export const mockSavedObjectsService = savedObjectsServiceMock.create();
jest.doMock('./saved_objects/saved_objects_service', () => ({
  SavedObjectsService: jest.fn(() => mockSavedObjectsService),
}));

import { contextServiceMock } from './context/context_service.mock';
export const mockContextService = contextServiceMock.create();
jest.doMock('./context/context_service', () => ({
  ContextService: jest.fn(() => mockContextService),
}));

import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
export const mockUiSettingsService = uiSettingsServiceMock.create();
jest.doMock('./ui_settings/ui_settings_service', () => ({
  UiSettingsService: jest.fn(() => mockUiSettingsService),
}));

export const mockEnsureValidConfiguration = jest.fn();
jest.doMock('./legacy/config/ensure_valid_configuration', () => ({
  ensureValidConfiguration: mockEnsureValidConfiguration,
}));

import { RenderingService, mockRenderingService } from './rendering/__mocks__/rendering_service';
export { mockRenderingService };
jest.doMock('./rendering/rendering_service', () => ({ RenderingService }));

import { environmentServiceMock } from './environment/environment_service.mock';
export const mockEnvironmentService = environmentServiceMock.create();
jest.doMock('./environment/environment_service', () => ({
  EnvironmentService: jest.fn(() => mockEnvironmentService),
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

import { loggingServiceMock } from './logging/logging_service.mock';
export const mockLoggingService = loggingServiceMock.create();
jest.doMock('./logging/logging_service', () => ({
  LoggingService: jest.fn(() => mockLoggingService),
}));

import { auditTrailServiceMock } from './audit_trail/audit_trail_service.mock';
export const mockAuditTrailService = auditTrailServiceMock.create();
jest.doMock('./audit_trail/audit_trail_service', () => ({
  AuditTrailService: jest.fn(() => mockAuditTrailService),
}));
