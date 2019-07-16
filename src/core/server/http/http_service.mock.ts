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
import { HttpService } from './http_service';
import { HttpServerSetup } from './http_server';
import { HttpServiceSetup } from './http_service';
import { OnPreAuthToolkit } from './lifecycle/on_pre_auth';
import { AuthToolkit } from './lifecycle/auth';
import { OnPostAuthToolkit } from './lifecycle/on_post_auth';
import { sessionStorageMock } from './cookie_session_storage.mocks';

type ServiceSetupMockType = jest.Mocked<HttpServiceSetup> & {
  basePath: jest.Mocked<HttpServiceSetup['basePath']>;
};

const createBasePathMock = (): jest.Mocked<HttpServiceSetup['basePath']> => ({
  get: jest.fn(),
  set: jest.fn(),
  prepend: jest.fn(),
  remove: jest.fn(),
});

const createSetupContractMock = () => {
  const setupContract: ServiceSetupMockType = {
    // we can mock some hapi server method when we need it
    server: {} as Server,
    registerOnPreAuth: jest.fn(),
    registerAuth: jest.fn(),
    registerOnPostAuth: jest.fn(),
    registerRouter: jest.fn(),
    basePath: createBasePathMock(),
    auth: {
      get: jest.fn(),
      isAuthenticated: jest.fn(),
      getAuthHeaders: jest.fn(),
    },
    createNewServer: jest.fn(),
    isTlsEnabled: false,
  };
  setupContract.createNewServer.mockResolvedValue({} as HttpServerSetup);
  setupContract.registerAuth.mockResolvedValue({
    sessionStorageFactory: sessionStorageMock.createFactory(),
  });
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
  redirected: jest.fn(),
  rejected: jest.fn(),
});

const createAuthToolkitMock = (): jest.Mocked<AuthToolkit> => ({
  authenticated: jest.fn(),
  redirected: jest.fn(),
  rejected: jest.fn(),
});

const createOnPostAuthToolkitMock = (): jest.Mocked<OnPostAuthToolkit> => ({
  next: jest.fn(),
  redirected: jest.fn(),
  rejected: jest.fn(),
});

export const httpServiceMock = {
  create: createHttpServiceMock,
  createBasePath: createBasePathMock,
  createSetupContract: createSetupContractMock,
  createOnPreAuthToolkit: createOnPreAuthToolkitMock,
  createAuthToolkit: createAuthToolkitMock,
  createOnPostAuthToolkit: createOnPostAuthToolkitMock,
};
