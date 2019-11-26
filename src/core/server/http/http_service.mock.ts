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
import { InternalHttpServiceSetup } from './types';
import { HttpService } from './http_service';
import { OnPreAuthToolkit } from './lifecycle/on_pre_auth';
import { AuthToolkit } from './lifecycle/auth';
import { sessionStorageMock } from './cookie_session_storage.mocks';
import { IRouter } from './router';
import { OnPostAuthToolkit } from './lifecycle/on_post_auth';

type ServiceSetupMockType = jest.Mocked<InternalHttpServiceSetup> & {
  basePath: jest.Mocked<InternalHttpServiceSetup['basePath']>;
};

const createBasePathMock = (): jest.Mocked<InternalHttpServiceSetup['basePath']> => ({
  serverBasePath: '/mock-server-basepath',
  get: jest.fn(),
  set: jest.fn(),
  prepend: jest.fn(),
  remove: jest.fn(),
});

const createRouterMock = (): jest.Mocked<IRouter> => ({
  routerPath: '/',
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  getRoutes: jest.fn(),
  handleLegacyErrors: jest.fn().mockImplementation(handler => handler),
});

const createSetupContractMock = () => {
  const setupContract: ServiceSetupMockType = {
    // we can mock other hapi server methods when we need it
    server: ({
      route: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    } as unknown) as jest.MockedClass<Server>,
    createCookieSessionStorageFactory: jest.fn(),
    registerOnPreAuth: jest.fn(),
    registerAuth: jest.fn(),
    registerOnPostAuth: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    createRouter: jest.fn(),
    basePath: createBasePathMock(),
    auth: {
      get: jest.fn(),
      isAuthenticated: jest.fn(),
      getAuthHeaders: jest.fn(),
    },
    isTlsEnabled: false,
    config: {},
  };
  setupContract.createCookieSessionStorageFactory.mockResolvedValue(
    sessionStorageMock.createFactory()
  );
  setupContract.createRouter.mockImplementation(createRouterMock);
  return setupContract;
};

type HttpServiceContract = PublicMethodsOf<HttpService>;
const createHttpServiceMock = () => {
  const mocked: jest.Mocked<HttpServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockResolvedValue(createSetupContractMock());
  return mocked;
};

const createOnPreAuthToolkitMock = (): jest.Mocked<OnPreAuthToolkit> => ({
  next: jest.fn(),
  rewriteUrl: jest.fn(),
});

const createOnPostAuthToolkitMock = (): jest.Mocked<OnPostAuthToolkit> => ({
  next: jest.fn(),
});

const createAuthToolkitMock = (): jest.Mocked<AuthToolkit> => ({
  authenticated: jest.fn(),
});

export const httpServiceMock = {
  create: createHttpServiceMock,
  createBasePath: createBasePathMock,
  createSetupContract: createSetupContractMock,
  createOnPreAuthToolkit: createOnPreAuthToolkitMock,
  createOnPostAuthToolkit: createOnPostAuthToolkitMock,
  createAuthToolkit: createAuthToolkitMock,
  createRouter: createRouterMock,
};
