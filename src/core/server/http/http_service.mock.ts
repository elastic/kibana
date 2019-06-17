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

import { Server, ServerOptions } from 'hapi';
import { HttpService } from './http_service';
import { HttpServerSetup } from './http_server';
import { HttpServiceSetup } from './http_service';

type ServiceSetupMockType = jest.Mocked<HttpServiceSetup> & {
  basePath: jest.Mocked<HttpServiceSetup['basePath']>;
};
const createSetupContractMock = () => {
  const setupContract: ServiceSetupMockType = {
    options: ({} as unknown) as ServerOptions,
    // we can mock some hapi server method when we need it
    server: {} as Server,
    registerOnPreAuth: jest.fn(),
    registerAuth: jest.fn(),
    registerOnPostAuth: jest.fn(),
    registerRouter: jest.fn(),
    basePath: {
      get: jest.fn(),
      set: jest.fn(),
      prepend: jest.fn(),
      remove: jest.fn(),
    },
    auth: {
      get: jest.fn(),
      isAuthenticated: jest.fn(),
    },
    createNewServer: jest.fn(),
  };
  setupContract.createNewServer.mockResolvedValue({} as HttpServerSetup);
  return setupContract;
};

const createStartContractMock = () => {
  const startContract = {
    isListening: jest.fn(),
  };
  startContract.isListening.mockReturnValue(true);
  return startContract;
};

type HttpServiceContract = PublicMethodsOf<HttpService>;
const createHttpServiceMock = () => {
  const mocked: jest.Mocked<HttpServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockResolvedValue(createSetupContractMock());
  mocked.start.mockResolvedValue(createStartContractMock());
  return mocked;
};

export const httpServiceMock = {
  create: createHttpServiceMock,
  createSetupContract: createSetupContractMock,
};
