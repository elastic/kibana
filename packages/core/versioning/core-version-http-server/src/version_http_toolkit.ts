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
  RouteConfigOptions,
} from '@kbn/core-http-server';

type RqCtx = RequestHandlerContextBase;

/**
 * Assuming that version will be a monotonically increasing number where: version > 0.
 * @experimental
 */
export type Version = `${number}`;

/**
 * Arguments to create a {@link VersionedRouter | versioned router}.
 * @experimental
 */
export interface CreateVersionedRouterArgs<Ctx extends RqCtx = RqCtx> {
  /**
   * A router instance
   * @experimental
   */
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
 *     path: '/api/my-app/foo/{id?}',
 *     options: { timeout: { payload: 60000 }, access: 'public' },
 *   })
 *   .addVersion(
 *     {
 *       version: '1',
 *       validate: {
 *         query: schema.object({
 *           name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
 *         }),
 *         params: schema.object({
 *           id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
 *         }),
 *         body: schema.object({ foo: schema.string() }),
 *       },
 *     },
 *     async (ctx, req, res) => {
 *       await ctx.fooService.create(req.body.foo, req.params.id, req.query.name);
 *       return res.ok({ body: { foo: req.body.foo } });
 *     }
 *   )
 *   // BREAKING CHANGE: { foo: string } => { fooString: string } in body
 *   .addVersion(
 *     {
 *       version: '2',
 *       validate: {
 *         query: schema.object({
 *           name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
 *         }),
 *         params: schema.object({
 *           id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
 *         }),
 *         body: schema.object({ fooString: schema.string() }),
 *       },
 *     },
 *     async (ctx, req, res) => {
 *       await ctx.fooService.create(req.body.fooString, req.params.id, req.query.name);
 *       return res.ok({ body: { fooName: req.body.fooString } });
 *     }
 *   )
 * ```
 * @experimental
 */
export interface VersionHTTPToolkit {
  /**
   * Create a versioned router
   * @param args - The arguments to create a versioned router
   * @returns A versioned router
   * @experimental
   */
  createVersionedRouter<Ctx extends RqCtx = RqCtx>(
    args: CreateVersionedRouterArgs<Ctx>
  ): VersionedRouter<Ctx>;
}

/**
 * Converts an input property from optional to required. Needed for making RouteConfigOptions['access'] required.
 */
type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};

/**
 * Versioned route access flag, required
 * - '/api/foo' is 'public'
 * - '/internal/my-foo'  is 'internal'
 * Required
 */
type VersionedRouteConfigOptions = WithRequiredProperty<RouteConfigOptions<RouteMethod>, 'access'>;
/**
 * Configuration for a versioned route
 * @experimental
 */
export type VersionedRouteConfig<Method extends RouteMethod> = Omit<
  RouteConfig<unknown, unknown, unknown, Method>,
  'validate' | 'options'
> & { options: VersionedRouteConfigOptions };

/**
 * Create an {@link VersionedRoute | versioned route}.
 *
 * @param config - The route configuration
 * @returns A versioned route
 * @experimental
 */
export type VersionedRouteRegistrar<Method extends RouteMethod, Ctx extends RqCtx = RqCtx> = (
  config: VersionedRouteConfig<Method>
) => VersionedRoute<Method, Ctx>;

/**
 * A router, very similar to {@link IRouter} that will return an {@link VersionedRoute}
 * instead.
 * @experimental
 */
export interface VersionedRouter<Ctx extends RqCtx = RqCtx> {
  /** @experimental */
  get: VersionedRouteRegistrar<'get', Ctx>;
  /** @experimental */
  put: VersionedRouteRegistrar<'put', Ctx>;
  /** @experimental */
  post: VersionedRouteRegistrar<'post', Ctx>;
  /** @experimental */
  patch: VersionedRouteRegistrar<'patch', Ctx>;
  /** @experimental */
  delete: VersionedRouteRegistrar<'delete', Ctx>;
  /** @experimental */
  options: VersionedRouteRegistrar<'options', Ctx>;
}

/**
 * Options for a versioned route. Probably needs a lot more options like sunsetting
 * of an endpoint etc.
 * @experimental
 */
export interface AddVersionOpts<P, Q, B, Method extends RouteMethod = RouteMethod> {
  /**
   * Version to assign to this route
   * @experimental
   */
  version: Version;
  /**
   * Validation for this version of a route
   * @experimental
   */
  validate: false | RouteValidatorFullConfig<P, Q, B>;
}

/**
 * A versioned route
 * @experimental
 */
export interface VersionedRoute<
  Method extends RouteMethod = RouteMethod,
  Ctx extends RqCtx = RqCtx
> {
  /**
   * Add a new version of this route
   * @param opts {@link AddVersionOpts | Options} for this version of a route
   * @param handler The request handler for this version of a route
   * @returns A versioned route, allows for fluent chaining of version declarations
   * @experimental
   */
  addVersion<P, Q, B>(
    opts: AddVersionOpts<P, Q, B>,
    handler: RequestHandler<P, Q, B, Ctx>
  ): VersionedRoute<Method, Ctx>;
}
