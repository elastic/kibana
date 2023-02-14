/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { pipe } from 'fp-ts/lib/function';
import type { RequestHandler } from './request_handler';
import type { RequestHandlerContextBase } from './request_handler_context';
import type { RouteConfig, RouteMethod } from './route';
import type { IRouter, RouteRegistrar } from './router';
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
const logger: Logger = {} as any;

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

// Dummy types

/** Definitely subject to revision, just used for examples */
type Version = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

/**
 * ===================== General comments =====================
 * - In all designs it is possible to pass the version number to the handler
 *   function.
 * - When no API version is specified we will need to adopt the default behaviour of
 *   other Elastic APIs and this is TBD.
 */

/**
 * Open questions:
 * 1. Are individual APIs versioned or the entire API surface versioned?
 */

/**
 * ===================== First design =====================
 * We ask consumers to restate all consituents for each route and they
 * provide version number at the route level.
 *
 * This is perhaps the most verbose approach.
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

  const newRouter: Omit<IRouter, 'post'> & { post: NewRouteRegistrar1<unknown, unknown, unknown> } =
    {} as any;

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
 *   2. Fairly simple, does not require any refactoring to adopt
 * WEAKNESSES:
 *   1. More complicated for router implementation because we must
 *      accept duplicate paths + version to uniquely identify a route.
 *   2. Need to redeclare handlers for every version (increased effort to make new versions)
 * ===================== End first design =====================
 */

/**
 * ===================== Second design =====================
 *
 * See "Current API". Per route we registration we could:
 *
 * Change: Validation, Handler
 * Keep constant: Method, Path, Optional config
 *
 * If only Validation & Handler change across versions it implies a coupling between these two.
 *
 * One approach could be to tightly pair the validation and handler in the registrar's
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
 *   1. API clearly ties a route handler to a version
 *   2. Declare path and options once
 * WEAKNESSES:
 *   1. Repeated declare the options and the path... Introducing a new version
 *      will result in a lot of boilerplate.
 *   2. Handlers know versions by passed into a given router so you also need
 *      to redeclare handlers
 *   3. Perhaps an overfit for the problem at hand. The router implementation
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

  const v1Router = http.createRouter(); // defaults to creating v1 router
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

/**
 * ===================== Fourth design =====================
 * Take the lib/toolkit approach. Instead of baking the idea of versioning into
 * the router we can expose a toolkit for building a versioned API that uses our
 * HTTP router. The toolkit just wraps the router ensuring that the spec for
 * applying/extracting version information is followed.
 */

{
  /**
   * We must omit "validate" because we are going to declare multiple validations per route.
   */
  type VersionedRouteOpts = Omit<RouteConfig<unknown, unknown, unknown, RouteMethod>, 'validate'>;
  /**
   * Simplify the Registrar type by pre assigning the RouteMethod generic type
   */
  type Registrar<Context extends RequestHandlerContextBase> = RouteRegistrar<RouteMethod, Context>;
  /**
   * This is the primary interface for the toolkit
   */
  interface VersionedAPIToolkit {
    defineRoute<Context extends RequestHandlerContextBase>(
      registrar: Registrar<Context>,
      opts: VersionedRouteOpts
    ): VersionedRoute<Context>;
  }
  /**
   * The toolkit defines versioned routes, taking care of all the versioning shenanigans
   * in the background.
   */
  interface VersionedRoute<Context extends RequestHandlerContextBase = RequestHandlerContextBase> {
    addVersion<P, Q, B>(
      version: Version,
      opts: { validation: RouteValidatorFullConfig<P, Q, B> },
      handler: RequestHandler<P, Q, B, Context>
    ): VersionedRoute<Context>;
  }

  const vtk: VersionedAPIToolkit = {} as any;
  const myRouter: IRouter<{ test: number } & RequestHandlerContextBase> = {} as any;

  const versionedRoute = vtk
    .defineRoute(myRouter.post, { path: '/api/my-plugin/my-route', options: {} })
    .addVersion(
      '1',
      {
        validation: { body: schema.object({ n: schema.number({ min: 0, max: 1 }) }) },
      },
      async (ctx, req, res) => {
        logger.info(String(ctx.test));
        logger.info(String(req.body.n));
        return res.ok();
      }
    )
    .addVersion(
      '2',
      {
        validation: { body: schema.object({ b: schema.number({ min: 2, max: 3 }) }) },
      },
      async (ctx, req, res) => {
        logger.info(String(req.body.b));
        return res.ok();
      }
    );

  // OR point-free style

  // `addVersion` utility
  const addVersion =
    <P, Q, B, C extends RequestHandlerContextBase>(
      version: Version,
      opts: { validation: RouteValidatorFullConfig<P, Q, B> },
      handler: RequestHandler<P, Q, B, C>
    ) =>
    (versionedRouter: VersionedRoute<C>) =>
      versionedRouter;

  // Route declaration
  pipe(
    vtk.defineRoute(myRouter.post, { path: '/api/my-plugin/my-route', options: {} }),

    addVersion(
      '1',
      { validation: { body: schema.object({ n: schema.number({ min: 0, max: 1 }) }) } },
      async (ctx, req, res) => {
        logger.info(String(ctx.test));
        logger.info(String(req.body.n));
        return res.ok();
      }
    ),

    addVersion(
      '2',
      { validation: { body: schema.object({ b: schema.number({ min: 2, max: 3 }) }) } },
      async (ctx, req, res) => {
        logger.info(String(req.body.b));
        return res.ok();
      }
    )
  );
}
/**
 * STRENGTHS:
 *  1. Does not change the current router implementation and does not force
 *     consumers to change anything
 *  2. We can treat the versioning implementation as an open source protocol.
 *     Consumers can choose to create their own implementation (but increase maintenance).
 *  3. Removes only the boilerplate regarding versions
 * WEAKNESSES:
 *  1. Whole new API to design and implement
 *  2. Will it actually be used since this is only a recommendation?
 * ===================== End fourth design =====================
 */
