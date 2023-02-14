/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { RequestHandler } from './request_handler';
import type { RequestHandlerContextBase } from './request_handler_context';
import type { RouteConfig, RouteMethod } from './route';
import type { IRouter } from './router';
import type { RouteValidatorFullConfig } from './route_validator';
import type { HttpServiceSetup } from '../..';

/**
 * Constituents of a route in Kibana
 *
 * 1. Route method: put, post, get etc.
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

/** Definitely subject to revision, just used for examples */
type Version = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

/**
 * ===================== General comments =====================
 * - Each version design is an iteration where I tried to write down the pros
 *   and cons of the approach, so later designs may be more sophisticated than
 *   earlier ones.
 */

/**
 * Open questions:
 * 1. Is the convention that individual APIs are versioned or groups of APIs altogether?
 *    Should we care about this?
 */

/**
 * ===================== First design =====================
 * We ask consumers to restate all consituents for each route and they
 * provide version number at the route level.
 *
 * This is perhaps the most verbose "dumb" approach.
 */
{
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

  const newRouter: { post: NewRouteRegistrar1<unknown, unknown, unknown> } = {} as any;

  /**
   * EXAMPLE USAGE:
   */

  const common = {
    path: '/api/my-plugin/my-route',
    options: {},
  };

  newRouter.post(
    {
      ...common,
      version: '1',
      validate: { body: schema.object({ name: schema.string() }) },
    },
    async (ctx, req, res) => res.ok()
  );

  newRouter.post(
    {
      ...common,
      version: '2',
      validate: { body: schema.object({ name: schema.string(), lastName: schema.string() }) },
    },
    async (ctx, req, res) => res.ok()
  );

  newRouter.post(
    {
      ...common,
      version: '3',
      validate: {
        body: schema.object({
          name: schema.string(),
          lastName: schema.string(),
          age: schema.number(),
        }),
      },
    },
    async (ctx, req, res) => res.ok()
  );
}
/**
 *  * STRENGTHS:
 *   1. Preserves full power of route declaration, even per version of a route
 *   2. Fairly simple, does not require much refactoring to adopt
 * WEAKNESSES:
 *   1. More complicated for router implementation because we must
 *      accept duplicate paths + version to uniquely identify a route.
 *   2. Need to redeclare handlers for every version (increased effort to make new versions)
 *      I.e., this is super verbose. Especially if a new version of an API needs
 *      many new routes.
 * ===================== End first design =====================
 */

/**
 * ===================== Second design =====================
 *
 * Per route we registration we could:
 *
 * Change: Validation, Handler
 * Keep constant: Method, Path, Optional config
 *
 * If only Validation & Handler change across versions it implies a coupling between these two.
 *
 * We could tightly pair the validation and handler in the registrar's
 * API.
 */
{
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

  const newRouter: Omit<IRouter, 'post'> & { post: NewRouteRegistrar2 } = {} as any;

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

  newRouter.post(
    {
      path: '/api/my-plugin/my-route',
      options: {},
    },
    {
      '1': v1Route,
      '2': v2Route,
    }
  );
}
/**
 * STRENGTHS:
 *   1. API cleanly ties a route handler to a version
 *   2. Declare path and options once
 * WEAKNESSES:
 *   1. As with the previous design there is still some verbosity as new handlers
 *      must be defined for each version
 *   2. Perhaps an overfit for the problem at hand. The router implementation
 *      will fully internalize the notion of versions. How do we handle routes
 *      that are not versioned?
 * ===================== End second design =====================
 */

/**
 * ===================== Third design =====================
 * We make the assumption that version is decided at the "router" API level.
 *
 * For example:
 */
{
  const http: HttpServiceSetup & {
    createRouter: <Context extends RequestHandlerContextBase = RequestHandlerContextBase>(opt: {
      version: Version;
    }) => IRouter<Context>;
  } = {} as any;

  const v1Router = http.createRouter(); // defaults to not versioned?
  const v2Router = http.createRouter({ version: '2' });
  const v3Router = http.createRouter({ version: '3' });

  const common = {
    path: '/api/my-plugin/my-route',
    options: {},
  };

  v1Router.post(
    {
      ...common,
      validate: { body: schema.object({ name: schema.string() }) },
    },
    async (ctx /* version can be added to ctx */, req, res) => res.ok()
  );

  v2Router.post(
    {
      ...common,
      validate: {
        body: schema.object({
          name: schema.string(),
          lastName: schema.string(),
        }),
      },
    },
    async (ctx, req, res) => res.ok()
  );

  v3Router.post(
    {
      ...common,
      validate: {
        body: schema.object({
          name: schema.string(),
          lastName: schema.string(),
          age: schema.number(),
        }),
      },
    },
    async (ctx, req, res) => res.ok()
  );
}
/**
 *
 * STRENGTHS:
 *   1. Flexible, simple and easy to adopt
 *   2. Not very opinionated about how you structure your code
 *   3. The router API remains largely the same
 * WEAKNESSES:
 *   1. Repeatedly declare the options and the path... Introducing a new version
 *      will result in a lot of boilerplate.
 *   2. Building from (1) also need to redeclare handlers...
 *   3. Consumer code will need to pass around an increasing number of router
 *      version instances
 * ===================== End third design =====================
 */
