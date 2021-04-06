/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { createServerRouteRepository } from './create_server_route_repository';
import { decodeRequestParams } from './decode_request_params';
import { EndpointOf, ReturnOf, RouteRepositoryClient } from './typings';

// Generic arguments for createServerRouteRepository should be set,
// if not, registering routes should not be allowed
createServerRouteRepository().add({
  // @ts-expect-error
  endpoint: 'any_endpoint',
  // @ts-expect-error
  handler: async ({ params }) => {},
});

// If a params codec is not set, its type should not be available in
// the request handler.
createServerRouteRepository<{}, {}>().add({
  endpoint: 'endpoint_without_params',
  // @ts-expect-error params does not exist
  handler: async ({ params }) => {},
});

// If a params codec is set, its type _should_ be available in the
// request handler.
createServerRouteRepository<{}, {}>().add({
  endpoint: 'endpoint_with_params',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
  }),
  handler: async ({ params }) => {
    const {
      path: { serviceName },
    } = params;
  },
});

// Resources should be passed to the request handler.
createServerRouteRepository<{ context: { getSpaceId: () => string } }, {}>().add({
  endpoint: 'endpoint_with_params',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
  }),
  handler: async ({ context }) => {
    const spaceId = context.getSpaceId();
  },
});

// Create options are available when registering a route.
createServerRouteRepository<{}, { options: { tags: string[] } }>().add({
  endpoint: 'endpoint_with_params',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  handler: async ({ params }) => {},
});

const repository = createServerRouteRepository<{}, {}>()
  .add({
    endpoint: 'endpoint_without_params',
    handler: async () => {
      return {
        noParamsForMe: true,
      };
    },
  })
  .add({
    endpoint: 'endpoint_with_params',
    params: t.type({
      path: t.type({
        serviceName: t.string,
      }),
    }),
    handler: async ({ params }) => {
      return {
        yesParamsForMe: true,
      };
    },
  })
  .add({
    endpoint: 'endpoint_with_optional_params',
    params: t.partial({
      query: t.partial({
        serviceName: t.string,
      }),
    }),
    handler: async ({ params }) => {
      return {
        someParamsForMe: true,
      };
    },
  });

type TestRepository = typeof repository;

// EndpointOf should return all valid endpoints of a repository

const validEndpoints: Array<EndpointOf<TestRepository>> = [
  'endpoint_with_params',
  'endpoint_without_params',
  'endpoint_with_optional_params',
];

// @ts-expect-error Type '"this_endpoint_does_not_exist"' is not assignable to type '"endpoint_without_params" | "endpoint_with_params" | "endpoint_with_optional_params"'
const invalidEndpoints: Array<EndpointOf<TestRepository>> = ['this_endpoint_does_not_exist'];

// ReturnOf should return the return type of a request handler.

const noParamsValid: ReturnOf<TestRepository, 'endpoint_without_params'> = {
  noParamsForMe: true,
};

const noParamsInvalid: ReturnOf<TestRepository, 'endpoint_without_params'> = {
  // @ts-expect-error type '{ paramsForMe: boolean; }' is not assignable to type '{ noParamsForMe: boolean; }'.
  paramsForMe: true,
};

// RouteRepositoryClient

type TestClient = RouteRepositoryClient<TestRepository, { timeout: number }>;

const client: TestClient = {} as any;

// It should respect any additional create options.

// @ts-expect-error Property 'timeout' is missing
client({
  endpoint: 'endpoint_without_params',
});

client({
  endpoint: 'endpoint_without_params',
  timeout: 1,
});

// It does not allow params for routes without a params codec
client({
  endpoint: 'endpoint_without_params',
  // @ts-expect-error Object literal may only specify known properties, and 'params' does not exist in type
  params: {},
  timeout: 1,
});

// It requires params for routes with a params codec
client({
  endpoint: 'endpoint_with_params',
  params: {
    // @ts-expect-error property 'serviceName' is missing in type '{}'
    path: {},
  },
  timeout: 1,
});

// Params are optional if the codec has no required keys
client({
  endpoint: 'endpoint_with_optional_params',
  timeout: 1,
});

// If optional, an error will still occur if the params do not match
client({
  endpoint: 'endpoint_with_optional_params',
  timeout: 1,
  params: {
    // @ts-expect-error Object literal may only specify known properties, and 'path' does not exist in type
    path: '',
  },
});

// The return type is correctly inferred
client({
  endpoint: 'endpoint_with_params',
  params: {
    path: {
      serviceName: '',
    },
  },
  timeout: 1,
}).then((res) => {
  // @ts-expect-error Property 'noParamsForMe' is missing in type
  const invalidType: {
    noParamsForMe: boolean;
  } = res;

  const validType: {
    yesParamsForMe: boolean;
  } = res;
});

// decodeRequestParams should return the type of the codec that is passed
const validParams: { path: { serviceName: string } } = decodeRequestParams(
  {
    params: {
      serviceName: 'serviceName',
    },
    body: undefined,
    query: undefined,
  },
  t.type({ path: t.type({ serviceName: t.string }) })
);

// @ts-expect-error The types of 'path.serviceName' are incompatible between these types.
const invalidParams: { path: { serviceName: boolean } } = decodeRequestParams(
  {
    params: {
      serviceName: 'serviceName',
    },
    body: undefined,
    query: undefined,
  },
  t.type({ path: t.type({ serviceName: t.string }) })
);
