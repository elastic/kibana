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

import { Server } from 'hapi';
import { CspConfig } from '../csp';
import { mockRouter, RouterMock } from './router/router.mock';
import { configMock } from '../config/config.mock';
import {
  InternalHttpServiceSetup,
  HttpServiceSetup,
  HttpServiceStart,
  InternalHttpServiceStart,
} from './types';
import { HttpService } from './http_service';
import { AuthStatus } from './auth_state_storage';
import { OnPreRoutingToolkit } from './lifecycle/on_pre_routing';
import { AuthToolkit } from './lifecycle/auth';
import { sessionStorageMock } from './cookie_session_storage.mocks';
import { OnPostAuthToolkit } from './lifecycle/on_post_auth';
import { OnPreResponseToolkit } from './lifecycle/on_pre_response';

type BasePathMocked = jest.Mocked<InternalHttpServiceSetup['basePath']>;
type AuthMocked = jest.Mocked<InternalHttpServiceSetup['auth']>;

export type HttpServiceSetupMock = jest.Mocked<
  Omit<HttpServiceSetup, 'basePath' | 'createRouter'>
> & {
  basePath: BasePathMocked;
  createRouter: jest.MockedFunction<() => RouterMock>;
};
export type InternalHttpServiceSetupMock = jest.Mocked<
  Omit<InternalHttpServiceSetup, 'basePath' | 'createRouter'>
> & {
  basePath: BasePathMocked;
  createRouter: jest.MockedFunction<(path: string) => RouterMock>;
};
export type HttpServiceStartMock = jest.Mocked<HttpServiceStart> & {
  basePath: BasePathMocked;
};
export type InternalHttpServiceStartMock = jest.Mocked<InternalHttpServiceStart> & {
  basePath: BasePathMocked;
};

const createBasePathMock = (serverBasePath = '/mock-server-basepath'): BasePathMocked => ({
  serverBasePath,
  get: jest.fn().mockReturnValue(serverBasePath),
  set: jest.fn(),
  prepend: jest.fn(),
  remove: jest.fn(),
});

const createAuthMock = () => {
  const mock: AuthMocked = {
    get: jest.fn(),
    isAuthenticated: jest.fn(),
  };
  mock.get.mockReturnValue({ status: AuthStatus.authenticated, state: {} });
  mock.isAuthenticated.mockReturnValue(true);
  return mock;
};

const createInternalSetupContractMock = () => {
  const mock: InternalHttpServiceSetupMock = {
    // we can mock other hapi server methods when we need it
    server: ({
      name: 'http-server-test',
      version: 'kibana',
      route: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      config: jest.fn().mockReturnValue(configMock.create()),
    } as unknown) as jest.MockedClass<Server>,
    createCookieSessionStorageFactory: jest.fn(),
    registerOnPreRouting: jest.fn(),
    registerOnPreAuth: jest.fn(),
    registerAuth: jest.fn(),
    registerOnPostAuth: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    registerOnPreResponse: jest.fn(),
    createRouter: jest.fn().mockImplementation(() => mockRouter.create({})),
    registerStaticDir: jest.fn(),
    basePath: createBasePathMock(),
    csp: CspConfig.DEFAULT,
    auth: createAuthMock(),
    getAuthHeaders: jest.fn(),
    getServerInfo: jest.fn(),
  };
  mock.createCookieSessionStorageFactory.mockResolvedValue(sessionStorageMock.createFactory());
  mock.createRouter.mockImplementation(() => mockRouter.create());
  mock.getAuthHeaders.mockReturnValue({ authorization: 'authorization-header' });
  mock.getServerInfo.mockReturnValue({
    hostname: 'localhost',
    name: 'kibana',
    port: 80,
    protocol: 'http',
  });
  return mock;
};

const createSetupContractMock = () => {
  const internalMock = createInternalSetupContractMock();

  const mock: HttpServiceSetupMock = {
    createCookieSessionStorageFactory: internalMock.createCookieSessionStorageFactory,
    registerOnPreRouting: internalMock.registerOnPreRouting,
    registerOnPreAuth: jest.fn(),
    registerAuth: internalMock.registerAuth,
    registerOnPostAuth: internalMock.registerOnPostAuth,
    registerOnPreResponse: internalMock.registerOnPreResponse,
    basePath: internalMock.basePath,
    csp: CspConfig.DEFAULT,
    createRouter: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    auth: {
      get: internalMock.auth.get,
      isAuthenticated: internalMock.auth.isAuthenticated,
    },
    getServerInfo: internalMock.getServerInfo,
  };

  mock.createRouter.mockImplementation(() => internalMock.createRouter(''));

  return mock;
};

const createStartContractMock = () => {
  const mock: HttpServiceStartMock = {
    auth: createAuthMock(),
    basePath: createBasePathMock(),
    getServerInfo: jest.fn(),
  };

  return mock;
};

const createInternalStartContractMock = () => {
  const mock: InternalHttpServiceStartMock = {
    ...createStartContractMock(),
    isListening: jest.fn(),
  };

  mock.isListening.mockReturnValue(true);

  return mock;
};

type HttpServiceContract = PublicMethodsOf<HttpService>;

const createHttpServiceMock = () => {
  const mocked: jest.Mocked<HttpServiceContract> = {
    setup: jest.fn(),
    getStartContract: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockResolvedValue(createInternalSetupContractMock());
  mocked.getStartContract.mockReturnValue(createInternalStartContractMock());
  mocked.start.mockResolvedValue(createInternalStartContractMock());
  return mocked;
};

const createOnPreAuthToolkitMock = (): jest.Mocked<OnPreRoutingToolkit> => ({
  next: jest.fn(),
  rewriteUrl: jest.fn(),
});

const createOnPostAuthToolkitMock = (): jest.Mocked<OnPostAuthToolkit> => ({
  next: jest.fn(),
});

const createAuthToolkitMock = (): jest.Mocked<AuthToolkit> => ({
  authenticated: jest.fn(),
  notHandled: jest.fn(),
  redirected: jest.fn(),
});

const createOnPreResponseToolkitMock = (): jest.Mocked<OnPreResponseToolkit> => ({
  next: jest.fn(),
});

export const httpServiceMock = {
  create: createHttpServiceMock,
  createBasePath: createBasePathMock,
  createAuth: createAuthMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createSetupContract: createSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
  createStartContract: createStartContractMock,
  createOnPreAuthToolkit: createOnPreAuthToolkitMock,
  createOnPostAuthToolkit: createOnPostAuthToolkitMock,
  createOnPreResponseToolkit: createOnPreResponseToolkitMock,
  createAuthToolkit: createAuthToolkitMock,
  createRouter: mockRouter.create,
};
