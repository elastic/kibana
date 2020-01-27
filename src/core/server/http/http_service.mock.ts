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
import { mockRouter } from './router/router.mock';
import { InternalHttpServiceSetup } from './types';
import { HttpService } from './http_service';
import { OnPreAuthToolkit } from './lifecycle/on_pre_auth';
import { AuthToolkit } from './lifecycle/auth';
import { sessionStorageMock } from './cookie_session_storage.mocks';
import { OnPostAuthToolkit } from './lifecycle/on_post_auth';
import { OnPreResponseToolkit } from './lifecycle/on_pre_response';

export type HttpServiceSetupMock = jest.Mocked<InternalHttpServiceSetup> & {
  basePath: jest.Mocked<InternalHttpServiceSetup['basePath']>;
};

const createBasePathMock = (): jest.Mocked<InternalHttpServiceSetup['basePath']> => ({
  serverBasePath: '/mock-server-basepath',
  get: jest.fn(),
  set: jest.fn(),
  prepend: jest.fn(),
  remove: jest.fn(),
});

const createSetupContractMock = () => {
  const setupContract: HttpServiceSetupMock = {
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
    registerOnPreResponse: jest.fn(),
    createRouter: jest.fn().mockImplementation(() => mockRouter.create({})),
    basePath: createBasePathMock(),
    csp: CspConfig.DEFAULT,
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
  setupContract.createRouter.mockImplementation(() => mockRouter.create());
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

const createOnPreResponseToolkitMock = (): jest.Mocked<OnPreResponseToolkit> => ({
  next: jest.fn(),
});

export const httpServiceMock = {
  create: createHttpServiceMock,
  createBasePath: createBasePathMock,
  createSetupContract: createSetupContractMock,
  createOnPreAuthToolkit: createOnPreAuthToolkitMock,
  createOnPostAuthToolkit: createOnPostAuthToolkitMock,
  createOnPreResponseToolkit: createOnPreResponseToolkitMock,
  createAuthToolkit: createAuthToolkitMock,
  createRouter: mockRouter.create,
};
