/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client, TransportResult, TransportRequestOptions } from '@elastic/elasticsearch';
import type { PublicKeys } from '@kbn/utility-types';
import type { ElasticsearchClient, ICustomClusterClient } from '@kbn/core-elasticsearch-server';
import { PRODUCT_RESPONSE_HEADER } from '@kbn/core-elasticsearch-client-server-internal';
import { lazyObject } from '@kbn/lazy-object';

const omittedProps = [
  'diagnostic',
  'name',
  'connectionPool',
  'transport',
  'serializer',
  'acceptedParams',
] as Array<PublicKeys<Client>>;

export type DeeplyMockedApi<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? ClientApiMockInstance<ReturnType<T[P]>, Parameters<T[P]>>
    : DeeplyMockedApi<T[P]>;
} & T;

export interface ClientApiMockInstance<T, Y extends any[]> extends jest.MockInstance<T, Y> {
  /**
   * Helper API around `mockReturnValue` returning either the body or the whole TransportResult
   * depending on the `meta` parameter used during the call
   */
  mockResponse(value: Awaited<T>, opts?: Partial<Omit<TransportResult<T>, 'body'>>): this;

  /**
   * Helper API around `mockReturnValueOnce` returning either the body or the whole TransportResult
   * depending on the `meta` parameter used during the call
   */
  mockResponseOnce(value: Awaited<T>, opts?: Partial<Omit<TransportResult<T>, 'body'>>): this;

  /**
   * Helper API around `mockImplementation` returning either the body or the whole TransportResult
   * depending on the `meta` parameter used during the call
   */
  mockResponseImplementation(handler: (...args: Y) => Partial<TransportResult<Awaited<T>>>): this;

  /**
   * Helper API around `mockImplementationOnce` returning either the body or the whole TransportResult
   * depending on the `meta` parameter used during the call
   */
  mockResponseImplementationOnce(
    handler: (...args: Y) => Partial<TransportResult<Awaited<T>>>
  ): this;
}

// Helper to create a jest mock function with response helpers
const createMockedApi = <
  T = unknown,
  Y extends [any, TransportRequestOptions] = [any, TransportRequestOptions]
>(): ClientApiMockInstance<T, Y> => {
  const mock: ClientApiMockInstance<T, Y> = jest.fn() as any;

  mock.mockResponse = (value: T, opts?: Partial<Omit<TransportResult<T>, 'body'>>) => {
    mock.mockImplementation((args: unknown, options?: TransportRequestOptions) => {
      const meta = options?.meta ?? false;
      if (meta) {
        return Promise.resolve(createApiResponse({ ...opts, body: value })) as any;
      } else {
        return Promise.resolve(value) as Promise<T>;
      }
    });
    return mock;
  };

  mock.mockResponseOnce = (value: T, opts?: Partial<Omit<TransportResult<T>, 'body'>>) => {
    mock.mockImplementationOnce((args: unknown, options?: TransportRequestOptions) => {
      const meta = options?.meta ?? false;
      if (meta) {
        return Promise.resolve(createApiResponse({ ...opts, body: value })) as any;
      } else {
        return Promise.resolve(value) as Promise<T>;
      }
    });
    return mock;
  };

  mock.mockResponseImplementation = (
    handler: (...args: Y) => Partial<TransportResult<Awaited<T>>>
  ) => {
    mock.mockImplementation((args: unknown, options?: TransportRequestOptions) => {
      const meta = options?.meta ?? false;
      // @ts-expect-error couldn't do better while keeping compatibility this jest.MockInstance
      const response = handler(args, options);
      if (meta) {
        return Promise.resolve(createApiResponse(response)) as any;
      } else {
        return Promise.resolve(response.body ?? {}) as Promise<T>;
      }
    });
    return mock;
  };

  mock.mockResponseImplementationOnce = (
    handler: (...args: Y) => Partial<TransportResult<Awaited<T>>>
  ) => {
    mock.mockImplementationOnce((args: unknown, options?: TransportRequestOptions) => {
      const meta = options?.meta ?? false;
      // @ts-expect-error couldn't do better while keeping compatibility this jest.MockInstance
      const response = handler(args, options);
      if (meta) {
        return Promise.resolve(createApiResponse(response)) as any;
      } else {
        return Promise.resolve(response.body ?? {}) as Promise<T>;
      }
    });
    return mock;
  };

  return mock;
};

// Build a shape of the Elasticsearch client once, using a hoisted real client instance
// use jest.requireActual() to prevent weird errors when people mock @elastic/elasticsearch
const { Client: UnmockedClient } = jest.requireActual('@elastic/elasticsearch');

type ShapeNode = { type: 'method' } | { type: 'object'; props: Record<string, ShapeNode> };

let cachedShape: ShapeNode | null = null;

function getAllPropertyDescriptors(obj: Record<string, any>) {
  const map: Record<string, PropertyDescriptor> = {};
  let cur: any = obj;
  while (cur && cur !== Object.prototype) {
    const descs = Object.getOwnPropertyDescriptors(cur);
    for (const [k, d] of Object.entries(descs)) {
      if (!(k in map)) map[k] = d;
    }
    cur = Object.getPrototypeOf(cur);
  }
  return map;
}

function buildShapeRecursive(obj: any, isTopLevel: boolean, seen: WeakSet<object>): ShapeNode {
  const props: Record<string, ShapeNode> = {};
  const descriptors = getAllPropertyDescriptors(obj);
  for (const [key, desc] of Object.entries(descriptors)) {
    if (key === 'constructor') continue;
    if (isTopLevel && (omittedProps as string[]).includes(key)) continue;

    let value: any;
    if ('value' in desc) value = (desc as any).value;
    else if (typeof desc.get === 'function') {
      try {
        value = desc.get.call(obj);
      } catch {
        value = undefined;
      }
    }

    if (typeof value === 'function') {
      props[key] = { type: 'method' };
    } else if (value && typeof value === 'object') {
      if (seen.has(value)) continue;
      seen.add(value);
      props[key] = buildShapeRecursive(value, false, seen);
    }
  }
  return { type: 'object', props };
}

function getClientShape(): ShapeNode {
  if (cachedShape) return cachedShape;
  const client = new UnmockedClient({ node: 'http://127.0.0.1' });
  try {
    const shape = buildShapeRecursive(client, true, new WeakSet());
    cachedShape = shape;
    return shape;
  } finally {
    try {
      // ensure we close the actual client instance (ignore errors)
      void client.close();
    } catch {
      // ignore
    }
  }
}

function buildLazyMockFromShape(shape: ShapeNode, res: Promise<unknown>): any {
  if (shape.type !== 'object') return {};
  const target: Record<string, any> = {};

  const defineLazyMethod = (obj: Record<string, any>, key: string) => {
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      get() {
        const fn = createMockedApi();
        fn.mockImplementation(() => res);
        Object.defineProperty(obj, key, {
          value: fn,
          configurable: true,
          enumerable: true,
          writable: true,
        });
        return fn;
      },
      set(value) {
        Object.defineProperty(obj, key, {
          value,
          configurable: true,
          enumerable: true,
          writable: true,
        });
      },
    });
  };

  const defineLazyObject = (obj: Record<string, any>, key: string, childShape: ShapeNode) => {
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      get() {
        const child = buildLazyMockFromShape(childShape, res);
        Object.defineProperty(obj, key, {
          value: child,
          configurable: true,
          enumerable: true,
          writable: true,
        });
        return child;
      },
    });
  };

  for (const [key, node] of Object.entries(shape.props)) {
    if (node.type === 'method') {
      defineLazyMethod(target, key);
    } else if (node.type === 'object') {
      defineLazyObject(target, key, node);
    }
  }

  // Special cases based on prior behavior
  Object.defineProperty(target, 'diagnostic', {
    configurable: true,
    enumerable: false,
    get() {
      const d: any = {};
      for (const k of ['on', 'off', 'once']) {
        Object.defineProperty(d, k, {
          configurable: true,
          enumerable: false,
          get: () => jest.fn(),
        });
      }
      Object.defineProperty(target, 'diagnostic', {
        value: d,
        configurable: true,
        enumerable: false,
        writable: true,
      });
      return d;
    },
  });

  Object.defineProperty(target, 'transport', {
    configurable: true,
    enumerable: true,
    get() {
      const t = { request: jest.fn() } as any;
      Object.defineProperty(target, 'transport', {
        value: t,
        configurable: true,
        enumerable: true,
        writable: true,
      });
      return t;
    },
  });

  return target;
}

const createInternalClientMock = (res?: Promise<unknown>): DeeplyMockedApi<Client> => {
  const shape = getClientShape();
  const mockClient: any = buildLazyMockFromShape(
    shape,
    res ?? Object.freeze(createSuccessTransportRequestPromise({}))
  );

  mockClient.close = jest.fn().mockReturnValue(Promise.resolve());
  mockClient.child = jest.fn().mockImplementation(() => createInternalClientMock());

  return mockClient as DeeplyMockedApi<Client>;
};

export type ElasticsearchClientMock = DeeplyMockedApi<ElasticsearchClient>;

const createClientMock = (res?: Promise<unknown>): ElasticsearchClientMock =>
  createInternalClientMock(res) as unknown as ElasticsearchClientMock;

export interface ScopedClusterClientMock {
  asInternalUser: ElasticsearchClientMock;
  asCurrentUser: ElasticsearchClientMock;
  asSecondaryAuthUser: ElasticsearchClientMock;
}

const createScopedClusterClientMock = () => {
  const mock: ScopedClusterClientMock = lazyObject({
    asInternalUser: createClientMock(),
    asCurrentUser: createClientMock(),
    asSecondaryAuthUser: createClientMock(),
  });

  return mock;
};

export interface ClusterClientMock {
  asInternalUser: ElasticsearchClientMock;
  asScoped: jest.MockedFunction<() => ScopedClusterClientMock>;
}

const createClusterClientMock = () => {
  const mock: ClusterClientMock = lazyObject({
    asInternalUser: createClientMock(),
    asScoped: jest.fn().mockReturnValue(createScopedClusterClientMock()),
  });

  return mock;
};

export type CustomClusterClientMock = jest.Mocked<ICustomClusterClient> & ClusterClientMock;

const createCustomClusterClientMock = () => {
  const mock: CustomClusterClientMock = lazyObject({
    asInternalUser: createClientMock(),
    asScoped: jest.fn().mockReturnValue(createScopedClusterClientMock()),
    close: jest.fn().mockReturnValue(Promise.resolve()),
  });

  return mock;
};

const createSuccessTransportRequestPromise = <T>(
  body: T,
  { statusCode = 200 }: { statusCode?: number } = {},
  headers: Record<string, string | string[]> = { [PRODUCT_RESPONSE_HEADER]: 'Elasticsearch' }
): Promise<TransportResult<T> & T> => {
  const response = createApiResponse({ body, statusCode, headers });
  return Promise.resolve(response) as Promise<TransportResult<T> & T>;
};

const createErrorTransportRequestPromise = (err: any): Promise<never> => {
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
