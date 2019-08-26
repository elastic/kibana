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
import { PluginInitializerContext, CoreSetup, CoreStart } from '.';
import { loggingServiceMock } from './logging/logging_service.mock';
import { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { contextServiceMock } from './context/context_service.mock';

export { httpServerMock } from './http/http_server.mocks';
export { sessionStorageMock } from './http/cookie_session_storage.mocks';
export { configServiceMock } from './config/config_service.mock';
export { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
export { httpServiceMock } from './http/http_service.mock';
export { loggingServiceMock } from './logging/logging_service.mock';
export { SavedObjectsClientMock } from './saved_objects/service/saved_objects_client.mock';

export function pluginInitializerContextConfigMock<T>(config: T) {
  const mock: jest.Mocked<PluginInitializerContext<T>['config']> = {
    create: jest.fn().mockReturnValue(of(config)),
    createIfExists: jest.fn().mockReturnValue(of(config)),
  };

  return mock;
}

function pluginInitializerContextMock<T>(config: T) {
  const mock: PluginInitializerContext<T> = {
    opaqueId: Symbol(),
    logger: loggingServiceMock.create(),
    env: {
      mode: {
        dev: true,
        name: 'development',
        prod: false,
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
    basePath: httpService.basePath,
    isTlsEnabled: httpService.isTlsEnabled,
    createRouter: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
  };
  httpMock.createRouter.mockImplementation(() => httpService.createRouter(''));

  const mock: MockedKeys<CoreSetup> = {
    context: contextServiceMock.createSetupContract(),
    elasticsearch: elasticsearchServiceMock.createSetupContract(),
    http: httpMock,
  };

  return mock;
}

function createCoreStartMock() {
  const mock: MockedKeys<CoreStart> = {};

  return mock;
}

export const coreMock = {
  createSetup: createCoreSetupMock,
  createStart: createCoreStartMock,
  createPluginInitializerContext: pluginInitializerContextMock,
};
