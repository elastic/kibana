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
  RouteConfigOptions,
  RouteValidatorFullConfig,
  RequestHandlerContextBase,
} from '@kbn/core-http-server';

type RqCtx = RequestHandlerContextBase;

/** Assuming that version will be a monotonically increasing number where: version > 0. */
export type Version = `${number}`;

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
 *   .post({
 *     path: '/api/my-app/foo/{name?}',
 *     options: { timeout: { payload: 60000 } },
 *   })
 *   // First version of the API, accepts { foo: string } in the body
 *   .addVersion(
 *     { version: '1', validate: { body: schema.object({ foo: schema.string() }) } },
 *     async (ctx, req, res) => {
 *       await ctx.fooService.create(req.body.foo);
 *       return res.ok({ body: { foo: req.body.foo } });
 *     }
 *   )
 *   // Second version of the API, accepts { fooName: string } in the body
 *   .addVersion(
 *     {
 *       version: '2',
 *       path: '/api/my-app/foo/{id?}', // Update the path to something new
 *       validate: { body: schema.object({ fooName: schema.string() }) },
 *     },
 *     async (ctx, req, res) => {
 *       await ctx.fooService.create(req.body.fooName);
 *       return res.ok({ body: { fooName: req.body.fooName } });
 *     }
 *   );
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
 * Configuration for a versioned route
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
) => VersionedRoute<Method, Ctx>;

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
export interface AddVersionOpts<P, Q, B, Method extends RouteMethod = RouteMethod>
  extends RouteConfigOptions<Method> {
  /** Version to assign to this route */
  version: Version;
  /** Validation for this version of a route */
  validate: false | RouteValidatorFullConfig<P, Q, B>;
  /**
   * Override the path of of this "route". Useful to update, add or change existing path parameters.
   * @note This option should preferably not introduce dramatic changes to the path as we may be
   *       better of creating a new route entirely.
   */
  path?: string;
}

/** A versioned route */
export interface VersionedRoute<
  Method extends RouteMethod = RouteMethod,
  Ctx extends RqCtx = RqCtx
> {
  /**
   * Add a new version of this route
   * @param opts {@link AddVersionOpts | Options} for this version of a route
   * @param handler The request handler for this version of a route
   * @returns A versioned route, allows for fluent chaining of version declarations
   */
  addVersion<P, Q, B>(
    opts: AddVersionOpts<P, Q, B>,
    handler: RequestHandler<P, Q, B, Ctx>
  ): VersionedRoute<Method, Ctx>;
}
