/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { duration } from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import type { MockedKeys } from '@kbn/utility-types/jest';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  StartServicesAccessor,
  CorePreboot,
} from '.';
import { loggingSystemMock } from './logging/logging_system.mock';
import { loggingServiceMock } from './logging/logging_service.mock';
import { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { httpResourcesMock } from './http_resources/http_resources_service.mock';
import { contextServiceMock } from './context/context_service.mock';
import { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';
import { savedObjectsClientMock } from './saved_objects/service/saved_objects_client.mock';
import { typeRegistryMock as savedObjectsTypeRegistryMock } from './saved_objects/saved_objects_type_registry.mock';
import { renderingMock } from './rendering/rendering_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
import { SharedGlobalConfig } from './plugins';
import { capabilitiesServiceMock } from './capabilities/capabilities_service.mock';
import { metricsServiceMock } from './metrics/metrics_service.mock';
import { environmentServiceMock } from './environment/environment_service.mock';
import { statusServiceMock } from './status/status_service.mock';
import { coreUsageDataServiceMock } from './core_usage_data/core_usage_data_service.mock';
import { i18nServiceMock } from './i18n/i18n_service.mock';
import { deprecationsServiceMock } from './deprecations/deprecations_service.mock';
import { executionContextServiceMock } from './execution_context/execution_context_service.mock';
import { prebootServiceMock } from './preboot/preboot_service.mock';
import { docLinksServiceMock } from './doc_links/doc_links_service.mock';

export { configServiceMock, configDeprecationsMock } from './config/mocks';
export { httpServerMock } from './http/http_server.mocks';
export { httpResourcesMock } from './http_resources/http_resources_service.mock';
export { sessionStorageMock } from './http/cookie_session_storage.mocks';
export { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
export { httpServiceMock } from './http/http_service.mock';
export { loggingSystemMock } from './logging/logging_system.mock';
export { savedObjectsRepositoryMock } from './saved_objects/service/lib/repository.mock';
export { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';
export { migrationMocks } from './saved_objects/migrations/mocks';
export { typeRegistryMock as savedObjectsTypeRegistryMock } from './saved_objects/saved_objects_type_registry.mock';
export { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
export { metricsServiceMock } from './metrics/metrics_service.mock';
export { renderingMock } from './rendering/rendering_service.mock';
export { statusServiceMock } from './status/status_service.mock';
export { contextServiceMock } from './context/context_service.mock';
export { capabilitiesServiceMock } from './capabilities/capabilities_service.mock';
export { coreUsageDataServiceMock } from './core_usage_data/core_usage_data_service.mock';
export { i18nServiceMock } from './i18n/i18n_service.mock';
export { deprecationsServiceMock } from './deprecations/deprecations_service.mock';
export { executionContextServiceMock } from './execution_context/execution_context_service.mock';
export { docLinksServiceMock } from './doc_links/doc_links_service.mock';

export type { ElasticsearchClientMock } from './elasticsearch/client/mocks';

type MockedPluginInitializerConfig<T> = jest.Mocked<PluginInitializerContext<T>['config']>;

export function pluginInitializerContextConfigMock<T>(config: T) {
  const globalConfig: SharedGlobalConfig = {
    elasticsearch: {
      shardTimeout: duration('30s'),
      requestTimeout: duration('30s'),
      pingTimeout: duration('30s'),
    },
    path: { data: '/tmp' },
    savedObjects: {
      maxImportPayloadBytes: new ByteSizeValue(26214400),
    },
  };

  const mock: MockedPluginInitializerConfig<T> = {
    legacy: {
      globalConfig$: of(globalConfig),
      get: () => globalConfig,
    },
    create: jest.fn().mockReturnValue(of(config)),
    get: jest.fn().mockReturnValue(config),
  };

  return mock;
}

type PluginInitializerContextMock<T> = Omit<PluginInitializerContext<T>, 'config'> & {
  config: MockedPluginInitializerConfig<T>;
};

function pluginInitializerContextMock<T>(config: T = {} as T) {
  const mock: PluginInitializerContextMock<T> = {
    opaqueId: Symbol(),
    logger: loggingSystemMock.create(),
    env: {
      mode: {
        dev: true,
        name: 'development',
        prod: false,
      },
      packageInfo: {
        version: 'version',
        branch: 'branch',
        buildNum: 100,
        buildSha: 'buildSha',
        dist: false,
      },
      instanceUuid: 'instance-uuid',
      configs: ['/some/path/to/config/kibana.yml'],
    },
    config: pluginInitializerContextConfigMock<T>(config),
  };

  return mock;
}

type CorePrebootMockType = MockedKeys<CorePreboot> & {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createPreboot>;
};

function createCorePrebootMock() {
  const mock: CorePrebootMockType = {
    elasticsearch: elasticsearchServiceMock.createPreboot(),
    http: httpServiceMock.createPrebootContract(),
    preboot: prebootServiceMock.createPrebootContract(),
  };

  return mock;
}

type CoreSetupMockType = MockedKeys<CoreSetup> & {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createSetup>;
  getStartServices: jest.MockedFunction<StartServicesAccessor<any, any>>;
};

function createCoreSetupMock({
  pluginStartDeps = {},
  pluginStartContract,
}: {
  pluginStartDeps?: object;
  pluginStartContract?: any;
} = {}) {
  const httpMock: jest.Mocked<CoreSetup['http']> = {
    ...httpServiceMock.createSetupContract(),
    resources: httpResourcesMock.createRegistrar(),
  };

  const uiSettingsMock = {
    register: uiSettingsServiceMock.createSetupContract().register,
  };

  const mock: CoreSetupMockType = {
    capabilities: capabilitiesServiceMock.createSetupContract(),
    context: contextServiceMock.createSetupContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
    elasticsearch: elasticsearchServiceMock.createSetup(),
    http: httpMock,
    i18n: i18nServiceMock.createSetupContract(),
    savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
    status: statusServiceMock.createSetupContract(),
    uiSettings: uiSettingsMock,
    logging: loggingServiceMock.createSetupContract(),
    metrics: metricsServiceMock.createSetupContract(),
    deprecations: deprecationsServiceMock.createSetupContract(),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
    coreUsageData: {
      registerUsageCounter: coreUsageDataServiceMock.createSetupContract().registerUsageCounter,
    },
    getStartServices: jest
      .fn<Promise<[ReturnType<typeof createCoreStartMock>, object, any]>, []>()
      .mockResolvedValue([createCoreStartMock(), pluginStartDeps, pluginStartContract]),
  };

  return mock;
}

function createCoreStartMock() {
  const mock: MockedKeys<CoreStart> = {
    capabilities: capabilitiesServiceMock.createStartContract(),
    docLinks: docLinksServiceMock.createStartContract(),
    elasticsearch: elasticsearchServiceMock.createStart(),
    http: httpServiceMock.createStartContract(),
    metrics: metricsServiceMock.createStartContract(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    coreUsageData: coreUsageDataServiceMock.createStartContract(),
    executionContext: executionContextServiceMock.createInternalStartContract(),
  };

  return mock;
}

function createInternalCorePrebootMock() {
  const prebootDeps = {
    context: contextServiceMock.createPrebootContract(),
    elasticsearch: elasticsearchServiceMock.createInternalPreboot(),
    http: httpServiceMock.createInternalPrebootContract(),
    httpResources: httpResourcesMock.createPrebootContract(),
    uiSettings: uiSettingsServiceMock.createPrebootContract(),
    logging: loggingServiceMock.createInternalPrebootContract(),
    preboot: prebootServiceMock.createInternalPrebootContract(),
  };
  return prebootDeps;
}

function createInternalCoreSetupMock() {
  const setupDeps = {
    capabilities: capabilitiesServiceMock.createSetupContract(),
    context: contextServiceMock.createSetupContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
    elasticsearch: elasticsearchServiceMock.createInternalSetup(),
    http: httpServiceMock.createInternalSetupContract(),
    savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
    status: statusServiceMock.createInternalSetupContract(),
    environment: environmentServiceMock.createSetupContract(),
    i18n: i18nServiceMock.createSetupContract(),
    httpResources: httpResourcesMock.createSetupContract(),
    rendering: renderingMock.createSetupContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    logging: loggingServiceMock.createInternalSetupContract(),
    metrics: metricsServiceMock.createInternalSetupContract(),
    deprecations: deprecationsServiceMock.createInternalSetupContract(),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
    coreUsageData: coreUsageDataServiceMock.createSetupContract(),
  };
  return setupDeps;
}

function createInternalCoreStartMock() {
  const startDeps = {
    capabilities: capabilitiesServiceMock.createStartContract(),
    docLinks: docLinksServiceMock.createStartContract(),
    elasticsearch: elasticsearchServiceMock.createInternalStart(),
    http: httpServiceMock.createInternalStartContract(),
    metrics: metricsServiceMock.createInternalStartContract(),
    savedObjects: savedObjectsServiceMock.createInternalStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    coreUsageData: coreUsageDataServiceMock.createStartContract(),
    executionContext: executionContextServiceMock.createInternalStartContract(),
    deprecations: deprecationsServiceMock.createInternalStartContract(),
  };
  return startDeps;
}

function createCoreRequestHandlerContextMock() {
  return {
    savedObjects: {
      client: savedObjectsClientMock.create(),
      typeRegistry: savedObjectsTypeRegistryMock.create(),
      getClient: savedObjectsClientMock.create,
      getExporter: savedObjectsServiceMock.createExporter,
      getImporter: savedObjectsServiceMock.createImporter,
    },
    elasticsearch: {
      client: elasticsearchServiceMock.createScopedClusterClient(),
    },
    uiSettings: {
      client: uiSettingsServiceMock.createClient(),
    },
    deprecations: {
      client: deprecationsServiceMock.createClient(),
    },
  };
}

export const coreMock = {
  createPreboot: createCorePrebootMock,
  createSetup: createCoreSetupMock,
  createStart: createCoreStartMock,
  createInternalPreboot: createInternalCorePrebootMock,
  createInternalSetup: createInternalCoreSetupMock,
  createInternalStart: createInternalCoreStartMock,
  createPluginInitializerContext: pluginInitializerContextMock,
  createRequestHandlerContext: createCoreRequestHandlerContextMock,
};

export { savedObjectsClientMock };
