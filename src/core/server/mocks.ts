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
import { of } from 'rxjs';
import { duration } from 'moment';
import { PluginInitializerContext, CoreSetup, CoreStart } from '.';
import { CspConfig } from './csp';
import { loggingServiceMock } from './logging/logging_service.mock';
import { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { contextServiceMock } from './context/context_service.mock';
import { savedObjectsServiceMock } from './saved_objects/saved_objects_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
import { SharedGlobalConfig } from './plugins';
import { InternalCoreSetup, InternalCoreStart } from './internal_types';
import { capabilitiesServiceMock } from './capabilities/capabilities_service.mock';

export { httpServerMock } from './http/http_server.mocks';
export { sessionStorageMock } from './http/cookie_session_storage.mocks';
export { configServiceMock } from './config/config_service.mock';
export { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
export { httpServiceMock } from './http/http_service.mock';
export { loggingServiceMock } from './logging/logging_service.mock';
export { savedObjectsClientMock } from './saved_objects/service/saved_objects_client.mock';
export { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';
import { uuidServiceMock } from './uuid/uuid_service.mock';

export function pluginInitializerContextConfigMock<T>(config: T) {
  const globalConfig: SharedGlobalConfig = {
    kibana: { defaultAppId: 'home-mocks', index: '.kibana-tests' },
    elasticsearch: {
      shardTimeout: duration('30s'),
      requestTimeout: duration('30s'),
      pingTimeout: duration('30s'),
      startupTimeout: duration('30s'),
    },
    path: { data: '/tmp' },
  };

  const mock: jest.Mocked<PluginInitializerContext<T>['config']> = {
    legacy: { globalConfig$: of(globalConfig) },
    create: jest.fn().mockReturnValue(of(config)),
    createIfExists: jest.fn().mockReturnValue(of(config)),
  };

  return mock;
}

function pluginInitializerContextMock<T>(config: T = {} as T) {
  const mock: PluginInitializerContext<T> = {
    opaqueId: Symbol(),
    logger: loggingServiceMock.create(),
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
    },
    config: pluginInitializerContextConfigMock<T>(config),
  };

  return mock;
}

function createCoreSetupMock() {
  const httpService = httpServiceMock.createSetupContract();
  const httpMock: jest.Mocked<CoreSetup['http']> = {
    createCookieSessionStorageFactory: httpService.createCookieSessionStorageFactory,
    registerOnPreAuth: httpService.registerOnPreAuth,
    registerAuth: httpService.registerAuth,
    registerOnPostAuth: httpService.registerOnPostAuth,
    registerOnPreResponse: httpService.registerOnPreResponse,
    basePath: httpService.basePath,
    csp: CspConfig.DEFAULT,
    isTlsEnabled: httpService.isTlsEnabled,
    createRouter: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
  };
  httpMock.createRouter.mockImplementation(() => httpService.createRouter(''));

  const uiSettingsMock = {
    register: uiSettingsServiceMock.createSetupContract().register,
  };
  const mock: MockedKeys<CoreSetup> = {
    capabilities: capabilitiesServiceMock.createSetupContract(),
    context: contextServiceMock.createSetupContract(),
    elasticsearch: elasticsearchServiceMock.createSetup(),
    http: httpMock,
    savedObjects: savedObjectsServiceMock.createSetupContract(),
    uiSettings: uiSettingsMock,
    uuid: uuidServiceMock.createSetupContract(),
  };

  return mock;
}

function createCoreStartMock() {
  const mock: MockedKeys<CoreStart> = {
    capabilities: capabilitiesServiceMock.createStartContract(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
  };

  return mock;
}

function createInternalCoreSetupMock() {
  const setupDeps: InternalCoreSetup = {
    capabilities: capabilitiesServiceMock.createSetupContract(),
    context: contextServiceMock.createSetupContract(),
    elasticsearch: elasticsearchServiceMock.createInternalSetup(),
    http: httpServiceMock.createSetupContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    savedObjects: savedObjectsServiceMock.createSetupContract(),
    uuid: uuidServiceMock.createSetupContract(),
  };
  return setupDeps;
}

function createInternalCoreStartMock() {
  const startDeps: InternalCoreStart = {
    capabilities: capabilitiesServiceMock.createStartContract(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
  };
  return startDeps;
}

export const coreMock = {
  createSetup: createCoreSetupMock,
  createStart: createCoreStartMock,
  createInternalSetup: createInternalCoreSetupMock,
  createInternalStart: createInternalCoreStartMock,
  createPluginInitializerContext: pluginInitializerContextMock,
};
