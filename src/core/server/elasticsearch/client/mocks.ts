/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaClient } from '@elastic/elasticsearch/lib/api/kibana';
import type { TransportResult } from '@elastic/elasticsearch';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type { PublicKeys } from '@kbn/utility-types';
import { ElasticsearchClient } from './types';
import { ICustomClusterClient } from './cluster_client';

const omittedProps = [
  'diagnostic',
  'name',
  'connectionPool',
  'transport',
  'serializer',
  'helpers',
] as Array<PublicKeys<KibanaClient>>;

// the product header expected in every response from es
const PRODUCT_RESPONSE_HEADER = 'x-elastic-product';

// use jest.requireActual() to prevent weird errors when people mock @elastic/elasticsearch
const { Client: UnmockedClient } = jest.requireActual('@elastic/elasticsearch');
const createInternalClientMock = (res?: Promise<unknown>): DeeplyMockedKeys<KibanaClient> => {
  // we mimic 'reflection' on a concrete instance of the client to generate the mocked functions.
  const client = new UnmockedClient({
    node: 'http://127.0.0.1',
  });

  const getAllPropertyDescriptors = (obj: Record<string, any>) => {
    const descriptors = Object.entries(Object.getOwnPropertyDescriptors(obj));
    let prototype = Object.getPrototypeOf(obj);
    while (prototype != null && prototype !== Object.prototype) {
      descriptors.push(...Object.entries(Object.getOwnPropertyDescriptors(prototype)));
      prototype = Object.getPrototypeOf(prototype);
    }
    return descriptors;
  };

  const mockify = (obj: Record<string, any>, omitted: string[] = []) => {
    // the @elastic/elasticsearch::Client uses prototypical inheritance
    // so we have to crawl up the prototype chain and get all descriptors
    // to find everything that we should be mocking
    const descriptors = getAllPropertyDescriptors(obj);
    descriptors
      .filter(([key]) => !omitted.includes(key))
      .forEach(([key, descriptor]) => {
        if (typeof descriptor.value === 'function') {
          obj[key] = jest.fn(() => res ?? createSuccessTransportRequestPromise({}));
        } else if (typeof obj[key] === 'object' && obj[key] != null) {
          mockify(obj[key], omitted);
        }
      });
  };

  mockify(client, omittedProps);

  client.close = jest.fn().mockReturnValue(Promise.resolve());
  client.child = jest.fn().mockImplementation(() => createInternalClientMock());

  const mockGetter = (obj: Record<string, any>, propertyName: string) => {
    Object.defineProperty(obj, propertyName, {
      configurable: true,
      enumerable: false,
      get: () => jest.fn(),
      set: undefined,
    });
  };

  // `on`, `off`, and `once` are properties without a setter.
  // We can't `client.diagnostic.on = jest.fn()` because the following error will be thrown:
  // TypeError: Cannot set property on of #<Client> which has only a getter
  mockGetter(client.diagnostic, 'on');
  mockGetter(client.diagnostic, 'off');
  mockGetter(client.diagnostic, 'once');
  client.transport = {
    request: jest.fn(),
  };

  return client as DeeplyMockedKeys<KibanaClient>;
};

export type ElasticsearchClientMock = DeeplyMockedKeys<ElasticsearchClient>;

const createClientMock = (res?: Promise<unknown>): ElasticsearchClientMock =>
  createInternalClientMock(res) as unknown as ElasticsearchClientMock;

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

const createSuccessTransportRequestPromise = <T>(
  body: T,
  { statusCode = 200 }: { statusCode?: number } = {},
  headers: Record<string, string | string[]> = { [PRODUCT_RESPONSE_HEADER]: 'Elasticsearch' }
): Promise<TransportResult<T>> => {
  const response = createApiResponse({ body, statusCode, headers });

  return Promise.resolve(response) as Promise<TransportResult<T>>;
};

const createErrorTransportRequestPromise = (err: any): Promise<TransportResult<never>> => {
  return Promise.reject(err);
};

function createApiResponse<TResponse = Record<string, any>>(
  opts: Partial<TransportResult<TResponse>> = {}
): TransportResult<TResponse> {
  return {
    body: {} as any,
    statusCode: 200,
    headers: { [PRODUCT_RESPONSE_HEADER]: 'Elasticsearch' },
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
