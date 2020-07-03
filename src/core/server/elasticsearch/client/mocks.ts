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

import { ApiResponse } from '@elastic/elasticsearch';
import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { clientFacadeMock } from './client_facade.mock';
import { IScopedClusterClient } from './scoped_cluster_client';
import { IClusterClient, ICustomClusterClient } from './cluster_client';

const createScopedClusterClientMock = () => {
  const mock: jest.Mocked<IScopedClusterClient> = {
    asInternalUser: jest.fn(),
    asCurrentUser: jest.fn(),
  };

  mock.asInternalUser.mockReturnValue(clientFacadeMock.create());
  mock.asCurrentUser.mockReturnValue(clientFacadeMock.create());

  return mock;
};

const createClusterClientMock = () => {
  const mock: jest.Mocked<IClusterClient> = {
    asInternalUser: jest.fn(),
    asScoped: jest.fn(),
  };

  mock.asInternalUser.mockReturnValue(clientFacadeMock.create());
  mock.asScoped.mockReturnValue(createScopedClusterClientMock());

  return mock;
};

const createCustomClusterClientMock = () => {
  const mock: jest.Mocked<ICustomClusterClient> = {
    asInternalUser: jest.fn(),
    asScoped: jest.fn(),
    close: jest.fn(),
  };

  mock.asInternalUser.mockReturnValue(clientFacadeMock.create());
  mock.asScoped.mockReturnValue(createScopedClusterClientMock());

  return mock;
};

type MockedTransportRequestPromise<T> = TransportRequestPromise<T> & {
  abort: jest.MockedFunction<() => undefined>;
};

const createMockedClientResponse = <T>(body: T): MockedTransportRequestPromise<ApiResponse<T>> => {
  const response: ApiResponse<T> = {
    body,
    statusCode: 200,
    warnings: [],
    headers: {},
    meta: {} as any,
  };
  const promise = Promise.resolve(response);
  (promise as MockedTransportRequestPromise<ApiResponse<T>>).abort = jest.fn();

  return promise as MockedTransportRequestPromise<ApiResponse<T>>;
};

const createMockedClientError = (err: any): MockedTransportRequestPromise<never> => {
  const promise = Promise.reject(err);
  (promise as MockedTransportRequestPromise<never>).abort = jest.fn();
  return promise as MockedTransportRequestPromise<never>;
};

export const elasticsearchClientMock = {
  createClusterClient: createClusterClientMock,
  createCustomClusterClient: createCustomClusterClientMock,
  createScopedClusterClient: createScopedClusterClientMock,
  createFacade: clientFacadeMock.create,
  createClientResponse: createMockedClientResponse,
  createClientError: createMockedClientError,
};
