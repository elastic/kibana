/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from './request_handler';
import { RequestHandlerContextBase } from './request_handler_context';
import { RouteConfig, RouteMethod } from './route';
import { IRouter } from './router';
import { RouteValidatorFullConfig } from './route_validator';

/**
 * Constituents of a route in Kibana
 *
 * 1. Route method: put, post, get
 * 2. Path
 * 3. Validation
 * 4. Extra configuration like auth and timeout
 * 5. Handler function
 */

// Current API

const router: IRouter = {} as any;

// 1
router.get(
  {
    path: '/api/my-plugin/my-route', // 2
    validate: {}, // 3
    options: {}, // 4
  },
  // 5
  async (ctx, req, res) => {
    return res.ok();
  }
);

/**
 * ===================== First proposal =====================
 * We ask consumers to restate all consituents for each route.
 */

type Version = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

type NewRouteRegistrar1<
  P,
  Q,
  B,
  Context extends RequestHandlerContextBase = RequestHandlerContextBase,
  Method extends RouteMethod = 'get'
> = (
  route: RouteConfig<P, Q, B, Method> & { version: Version },
  handler: RequestHandler<P, Q, B, Context, Method>
) => void;

const examplePostRegistrar1: NewRouteRegistrar1<unknown, unknown, unknown> = {} as any;

/**
 * EXAMPLE USAGE:
 */

const common = {
  path: '/api/my-plugin/my-route',
  options: {},
};

examplePostRegistrar1(
  {
    ...common,
    version: '1',
    validate: { body: schema.object({ name: schema.string() }) },
  },
  async (ctx, req, res) => res.ok()
);

examplePostRegistrar1(
  {
    ...common,
    version: '2',
    validate: { body: schema.object({ name: schema.string(), lastName: schema.string() }) },
  },
  async (ctx, req, res) => res.ok()
);

examplePostRegistrar1(
  {
    ...common,
    validate: {
      body: schema.object({
        name: schema.string(),
        lastName: schema.string(),
        age: schema.number(),
      }),
    },
    version: '3',
  },
  async (ctx, req, res) => res.ok()
);

/**
 * ===================== End first proposal =====================
 */

/**
 * ===================== Second proposal =====================
 *
 * See "Current API". We could also:
 *
 * Change: 3, 5
 * Keep constant: 1, 2, 4
 *
 * If 3 & 5 change across versions it implies a coupling between these two. Specifically,
 * whenever a new version is added we know we need new validation (for the new API) and
 * we need to tite this to a handler.
 *
 * One approach could be to tightly pair the validation and handler in the registrar's
 * API.
 */

interface Handler<
  P,
  Q,
  B,
  Context extends RequestHandlerContextBase = RequestHandlerContextBase,
  Method extends RouteMethod = 'get'
> {
  validate: RouteValidatorFullConfig<P, Q, B> | false;
  handler: RequestHandler<P, Q, B, Context, Method>;
}

type NewRouteRegistrar2<
  Method extends RouteMethod = 'get',
  Context extends RequestHandlerContextBase = RequestHandlerContextBase
> = (
  route: Omit<RouteConfig<unknown, unknown, unknown, Method>, 'validate'>,
  handlers: {
    [version in Version]?: Handler<unknown, unknown, unknown, Context, Method>;
  }
) => void;

const examplePostRegistrar2: NewRouteRegistrar2 = {} as any;

/**
 * EXAMPLE USAGE:
 */

const v1Route: Handler<unknown, unknown, unknown> = {
  validate: {
    body: schema.object({
      name: schema.string(),
    }),
  },
  handler: async (ctx, req, res) => res.ok(),
};

const v2Route: Handler<unknown, unknown, unknown> = {
  validate: {
    body: schema.object({
      name: schema.string(),
      lastName: schema.string(),
    }),
  },
  handler: async (ctx, req, res) => res.ok(),
};

examplePostRegistrar2(
  {
    path: '/api/my-plugin/my-route',
    options: {},
  },
  {
    '1': v1Route,
    '2': v2Route,
  }
);

/**
 * ===================== End second proposal =====================
 */

/**
 * Open questions:
 *
 * 1. What is the default behaviour when we don't have a version specified? Latest stable?
 */
