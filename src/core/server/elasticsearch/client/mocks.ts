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
import { Client, ApiResponse } from '@elastic/elasticsearch';
import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { ElasticsearchClient } from './types';
import { ICustomClusterClient } from './cluster_client';

const createInternalClientMock = (): DeeplyMockedKeys<Client> => {
  // we mimic 'reflection' on a concrete instance of the client to generate the mocked functions.
  const client = new Client({
    node: 'http://localhost',
  }) as any;

  const omittedProps = [
    '_events',
    '_eventsCount',
    '_maxListeners',
    'name',
    'serializer',
    'connectionPool',
    'transport',
    'helpers',
  ];

  const mockify = (obj: Record<string, any>, omitted: string[] = []) => {
    Object.keys(obj)
      .filter((key) => !omitted.includes(key))
      .forEach((key) => {
        const propType = typeof obj[key];
        if (propType === 'function') {
          obj[key] = jest.fn(() => createSuccessTransportRequestPromise({}));
        } else if (propType === 'object' && obj[key] != null) {
          mockify(obj[key]);
        }
      });
  };

  mockify(client, omittedProps);

  // client got some read-only (getter) properties
  // so we need to extend it to override the getter-only props.
  const mock: any = { ...client };

  mock.transport = {
    request: jest.fn(),
  };
  mock.close = jest.fn().mockReturnValue(Promise.resolve());
  mock.child = jest.fn().mockImplementation(() => createInternalClientMock());
  mock.on = jest.fn();
  mock.off = jest.fn();
  mock.once = jest.fn();

  return (mock as unknown) as DeeplyMockedKeys<Client>;
};

export type ElasticsearchClientMock = DeeplyMockedKeys<ElasticsearchClient>;

const createClientMock = (): ElasticsearchClientMock =>
  (createInternalClientMock() as unknown) as ElasticsearchClientMock;

export interface ScopedClusterClientMock {
  asInternalUser: ElasticsearchClientMock;
  asCurrentUser: ElasticsearchClientMock;
}

const createScopedClusterClientMock = () => {
  const mock: ScopedClusterClientMock = {
    asInternalUser: createClientMock(),
    asCurrentUser: createClientMock(),
  };

  return mock;
};

export interface ClusterClientMock {
  asInternalUser: ElasticsearchClientMock;
  asScoped: jest.MockedFunction<() => ScopedClusterClientMock>;
}

const createClusterClientMock = () => {
  const mock: ClusterClientMock = {
    asInternalUser: createClientMock(),
    asScoped: jest.fn(),
  };

  mock.asScoped.mockReturnValue(createScopedClusterClientMock());

  return mock;
};

export type CustomClusterClientMock = jest.Mocked<ICustomClusterClient> & ClusterClientMock;

const createCustomClusterClientMock = () => {
  const mock: CustomClusterClientMock = {
    asInternalUser: createClientMock(),
    asScoped: jest.fn(),
    close: jest.fn(),
  };

  mock.asScoped.mockReturnValue(createScopedClusterClientMock());
  mock.close.mockReturnValue(Promise.resolve());

  return mock;
};

export type MockedTransportRequestPromise<T> = TransportRequestPromise<T> & {
  abort: jest.MockedFunction<() => undefined>;
};

const createSuccessTransportRequestPromise = <T>(
  body: T,
  { statusCode = 200 }: { statusCode?: number } = {}
): MockedTransportRequestPromise<ApiResponse<T>> => {
  const response = createApiResponse({ body, statusCode });
  const promise = Promise.resolve(response);
  (promise as MockedTransportRequestPromise<ApiResponse<T>>).abort = jest.fn();

  return promise as MockedTransportRequestPromise<ApiResponse<T>>;
};

const createErrorTransportRequestPromise = (err: any): MockedTransportRequestPromise<never> => {
  const promise = Promise.reject(err);
  (promise as MockedTransportRequestPromise<never>).abort = jest.fn();
  return promise as MockedTransportRequestPromise<never>;
};

function createApiResponse(opts: Partial<ApiResponse> = {}): ApiResponse {
  return {
    body: {},
    statusCode: 200,
    headers: {},
    warnings: [],
    meta: {} as any,
    ...opts,
  };
}

export const elasticsearchClientMock = {
  createClusterClient: createClusterClientMock,
  createCustomClusterClient: createCustomClusterClientMock,
  createScopedClusterClient: createScopedClusterClientMock,
  createElasticsearchClient: createClientMock,
  createInternalClient: createInternalClientMock,
  createSuccessTransportRequestPromise,
  createErrorTransportRequestPromise,
  createApiResponse,
};
