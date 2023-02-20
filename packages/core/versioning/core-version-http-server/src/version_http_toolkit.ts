/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  IRouter,
  RouteConfig,
  RouteMethod,
  RequestHandler,
  RouteValidatorFullConfig,
  RequestHandlerContextBase,
} from '@kbn/core-http-server';

type RqCtx = RequestHandlerContextBase;

/** A set of type literals to determine accepted versions */
export type Version = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

/** Arguments to create a {@link VersionedRouter | versioned router}. */
export interface CreateVersionedRouterArgs<Ctx extends RqCtx = RqCtx> {
  /** A router instance */
  router: IRouter<Ctx>;
}

/**
 * This interface is the starting point for creating versioned routers and routes
 *
 * @example
 * const versionedRouter = vtk.createVersionedRouter({ router });
 *
 * ```ts
 * const versionedRoute = versionedRouter
 *  .post({
 *    path: '/api/my-app/foo',
 *    options: { timeout: { payload: 60000 } },
 *  })
 *  // First version of the API, accepts { foo: string } in the body
 *  .addVersion(
 *    { version: '1', validate: { body: schema.object({ foo: schema.string() }) } },
 *    async (ctx, req, res) => {
 *      await ctx.fooService.create(req.body.foo);
 *      return res.ok({ body: { foo: req.body.foo } });
 *    }
 *  )
 *  // Second version of the API, accepts { fooName: string } in the body
 *  .addVersion(
 *    { version: '2', validate: { body: schema.object({ fooName: schema.string() }) } },
 *    async (ctx, req, res) => {
 *      await ctx.fooService.create(req.body.fooName);
 *      return res.ok({ body: { fooName: req.body.fooName } });
 *    }
 *  );
 * ```
 */
export interface VersionHTTPToolkit {
  /**
   * Create a versioned router
   * @param args - The arguments to create a versioned router
   * @returns A versioned router
   */
  createVersionedRouter<Ctx extends RqCtx = RqCtx>(
    args: CreateVersionedRouterArgs<Ctx>
  ): VersionedRouter<Ctx>;
}

/**
 * Configuraiton for a versioned route
 */
export type VersionedRouteConfig<Method extends RouteMethod> = Omit<
  RouteConfig<unknown, unknown, unknown, Method>,
  'validate'
>;

/**
 * Create an {@link VersionedRoute | versioned route}.
 *
 * @param config - The route configuration
 * @returns A versioned route
 */
export type VersionedRouteRegistrar<Method extends RouteMethod, Ctx extends RqCtx = RqCtx> = (
  config: VersionedRouteConfig<Method>
) => VersionedRoute<Ctx>;

/**
 * A router, very similar to {@link IRouter} that will return an {@link VersionedRoute}
 * instead.
 */
export interface VersionedRouter<Ctx extends RqCtx = RqCtx> {
  get: VersionedRouteRegistrar<'get', Ctx>;
  put: VersionedRouteRegistrar<'put', Ctx>;
  post: VersionedRouteRegistrar<'post', Ctx>;
  patch: VersionedRouteRegistrar<'patch', Ctx>;
  delete: VersionedRouteRegistrar<'delete', Ctx>;
  options: VersionedRouteRegistrar<'options', Ctx>;
}

/**
 * Options for a versioned route. Probably needs a lot more options like sunsetting
 * of an endpoint etc.
 */
export interface AddVersionOpts<P, Q, B> {
  /** Version to assign to this route */
  version: Version;
  /** Validation for this version of a route */
  validate: false | RouteValidatorFullConfig<P, Q, B>;
}

/** A versioned route */
export interface VersionedRoute<Ctx extends RqCtx = RqCtx> {
  /**
   * Add a new version of this route
   * @param opts {@link AddVersionOpts | Options} for this version of a route
   * @param handler The request handler for this version of a route
   * @returns A versioned route, allows for fluent chaining of version declarations
   */
  addVersion<P, Q, B>(
    opts: AddVersionOpts<P, Q, B>,
    handler: RequestHandler<P, Q, B, Ctx>
  ): VersionedRoute<Ctx>;
}
