/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { kibanaResponseFactory } from '@kbn/core/server';
import { EndpointOf, ReturnOf, RouteRepositoryClient } from '@kbn/server-route-repository-utils';
import { createServerRouteFactory } from './create_server_route_factory';
import { decodeRequestParams } from './decode_request_params';

function assertType<TShape = never>(value: TShape) {
  return value;
}

// If a params codec is not set, its type should not be available in
// the request handler.
createServerRouteFactory<{}, {}>()({
  endpoint: 'GET /internal/endpoint_without_params',
  handler: async (resources) => {
    // @ts-expect-error Argument of type '{}' is not assignable to parameter of type '{ params: any; }'.
    assertType<{ params: any }>(resources);
  },
});

// If a params codec is set, its type _should_ be available in the
// request handler.
createServerRouteFactory<{}, {}>()({
  endpoint: 'GET /internal/endpoint_with_params',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
  }),
  handler: async (resources) => {
    assertType<{ params: { path: { serviceName: string } } }>(resources);
  },
});

// Resources should be passed to the request handler.
createServerRouteFactory<{ context: { getSpaceId: () => string } }, {}>()({
  endpoint: 'GET /internal/endpoint_with_params',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
  }),
  handler: async ({ context }) => {
    const spaceId = context.getSpaceId();
    assertType<string>(spaceId);
  },
});

// Create options are available when registering a route.
createServerRouteFactory<{}, { options: { tags: string[] } }>()({
  endpoint: 'GET /internal/endpoint_with_params',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  handler: async (resources) => {
    assertType<{ params: { path: { serviceName: string } } }>(resources);
  },
});

// Public APIs should be versioned
// @ts-expect-error
createServerRouteFactory<{}, { options: { tags: string[] } }>()({
  endpoint: 'GET /api/endpoint_with_params',
  options: {
    tags: [],
  },
  // @ts-expect-error
  handler: async (resources) => {},
});

createServerRouteFactory<{}, { options: { tags: string[] } }>()({
  endpoint: 'GET /api/endpoint_with_params 2023-10-31',
  options: {
    tags: [],
  },
  handler: async (resources) => {},
});

const createServerRoute = createServerRouteFactory<{}, {}>();

const repository = {
  ...createServerRoute({
    endpoint: 'GET /internal/endpoint_without_params',
    handler: async () => {
      return {
        noParamsForMe: true,
      };
    },
  }),
  ...createServerRoute({
    endpoint: 'GET /internal/endpoint_with_params',
    params: t.type({
      path: t.type({
        serviceName: t.string,
      }),
    }),
    handler: async () => {
      return {
        yesParamsForMe: true,
      };
    },
  }),
  ...createServerRoute({
    endpoint: 'GET /internal/endpoint_with_optional_params',
    params: t.partial({
      query: t.partial({
        serviceName: t.string,
      }),
    }),
    handler: async () => {
      return {
        someParamsForMe: true,
      };
    },
  }),
  ...createServerRoute({
    endpoint: 'GET /internal/endpoint_returning_result',
    handler: async () => {
      return {
        result: true,
      };
    },
  }),
  ...createServerRoute({
    endpoint: 'GET /internal/endpoint_returning_kibana_response',
    handler: async () => {
      return kibanaResponseFactory.ok({
        body: {
          result: true,
        },
      });
    },
  }),
};

type TestRepository = typeof repository;

// EndpointOf should return all valid endpoints of a repository

assertType<Array<EndpointOf<TestRepository>>>([
  'GET /internal/endpoint_with_params',
  'GET /internal/endpoint_without_params',
  'GET /internal/endpoint_with_optional_params',
]);

// @ts-expect-error Type '"this_endpoint_does_not_exist"' is not assignable to type '"endpoint_without_params" | "endpoint_with_params" | "endpoint_with_optional_params"'
assertType<Array<EndpointOf<TestRepository>>>(['this_endpoint_does_not_exist']);

// ReturnOf should return the return type of a request handler.

assertType<ReturnOf<TestRepository, 'GET /internal/endpoint_without_params'>>({
  noParamsForMe: true,
});

const noParamsInvalid: ReturnOf<TestRepository, 'GET /internal/endpoint_without_params'> = {
  // @ts-expect-error type '{ paramsForMe: boolean; }' is not assignable to type '{ noParamsForMe: boolean; }'.
  paramsForMe: true,
};

assertType<ReturnOf<TestRepository, 'GET /internal/endpoint_returning_result'>>({
  result: true,
});

assertType<ReturnOf<TestRepository, 'GET /internal/endpoint_returning_kibana_response'>>({
  result: true,
});

// RouteRepositoryClient

type TestClient = RouteRepositoryClient<TestRepository, { timeout: number }>;

const client: TestClient = {} as any;

// It should respect any additional create options.

// @ts-expect-error Property 'timeout' is missing
client('GET /internal/endpoint_without_params', {});

client('GET /internal/endpoint_without_params', {
  timeout: 1,
});

// It does not allow params for routes without a params codec
client('GET /internal/endpoint_without_params', {
  // @ts-expect-error Object literal may only specify known properties, and 'params' does not exist in type
  params: {},
  timeout: 1,
});

// It requires params for routes with a params codec
client('GET /internal/endpoint_with_params', {
  params: {
    // @ts-expect-error property 'serviceName' is missing in type '{}'
    path: {},
  },
  timeout: 1,
});

// Params are optional if the codec has no required keys
client('GET /internal/endpoint_with_optional_params', {
  timeout: 1,
});

// If optional, an error will still occur if the params do not match
client('GET /internal/endpoint_with_optional_params', {
  timeout: 1,
  params: {
    // @ts-expect-error Object literal may only specify known properties, and 'path' does not exist in type
    path: '',
  },
});

// The return type is correctly inferred
client('GET /internal/endpoint_with_params', {
  params: {
    path: {
      serviceName: '',
    },
  },
  timeout: 1,
}).then((res) => {
  assertType<{
    noParamsForMe: boolean;
    // @ts-expect-error Property 'noParamsForMe' is missing in type
  }>(res);

  assertType<{
    yesParamsForMe: boolean;
  }>(res);
});

client('GET /internal/endpoint_returning_result', {
  timeout: 1,
}).then((res) => {
  assertType<{
    result: boolean;
  }>(res);
});

client('GET /internal/endpoint_returning_kibana_response', {
  timeout: 1,
}).then((res) => {
  assertType<{
    result: boolean;
  }>(res);
});

// decodeRequestParams should return the type of the codec that is passed
assertType<{ path: { serviceName: string } }>(
  decodeRequestParams(
    {
      params: {
        serviceName: 'serviceName',
      },
      body: undefined,
      query: undefined,
    },
    t.type({ path: t.type({ serviceName: t.string }) })
  )
);

assertType<{ path: { serviceName: boolean } }>(
  // @ts-expect-error The types of 'path.serviceName' are incompatible between these types.
  decodeRequestParams(
    {
      params: {
        serviceName: 'serviceName',
      },
      body: undefined,
      query: undefined,
    },
    t.type({ path: t.type({ serviceName: t.string }) })
  )
);
