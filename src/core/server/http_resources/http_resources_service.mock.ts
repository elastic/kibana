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
import { httpServerMock } from '../http/http_server.mocks';
import { HttpResources, HttpResourcesServiceToolkit } from './types';

const createHttpResourcesMock = (): jest.Mocked<HttpResources> => ({
  register: jest.fn(),
});

function createInternalHttpResourcesSetup() {
  return {
    createRegistrar: jest.fn(() => createHttpResourcesMock()),
  };
}

function createHttpResourcesResponseFactory() {
  const mocked: jest.Mocked<HttpResourcesServiceToolkit> = {
    renderCoreApp: jest.fn(),
    renderAnonymousCoreApp: jest.fn(),
    renderHtml: jest.fn(),
    renderJs: jest.fn(),
  };

  return {
    ...httpServerMock.createResponseFactory(),
    ...mocked,
  };
}

export const httpResourcesMock = {
  createRegistrar: createHttpResourcesMock,
  createSetupContract: createInternalHttpResourcesSetup,
  createResponseFactory: createHttpResourcesResponseFactory,
};
