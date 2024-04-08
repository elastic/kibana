/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Type } from '@kbn/config-schema';
import type { ApiVersion } from '@kbn/core-http-common';
import type { MaybePromise } from '@kbn/utility-types';
import type {
  RouteConfig,
  RouteMethod,
  RequestHandler,
  IKibanaResponse,
  RouteConfigOptions,
  RouteValidatorFullConfigRequest,
  RequestHandlerContextBase,
  RouteValidationFunction,
} from '../..';

type RqCtx = RequestHandlerContextBase;

export type { ApiVersion };

/**
 * Configuration for a versioned route
 * @public
 */
export type VersionedRouteConfig<Method extends RouteMethod> = Omit<
  RouteConfig<unknown, unknown, unknown, Method>,
  'validate' | 'options'
> & {
  options?: Omit<RouteConfigOptions<Method>, 'access'>;
  /** See {@link RouteConfigOptions<RouteMethod>['access']} */
  access: Exclude<RouteConfigOptions<Method>['access'], undefined>;
  /**
   * When enabled, the router will also check for the presence of an `apiVersion`
   * query parameter to determine the route version to resolve to:
   *
   * `/api/my-app/foo?apiVersion=1`
   *
   * This enables use cases like a versioned Kibana endpoint
   * inside an <img /> tag's href. Otherwise it should _not_ be enabled.
   *
   * @note When enabled and both query parameter and header are present, header
   *       will take precedence.
   * @note When enabled `apiVersion` is a reserved query parameter and will not
   *       be passed to the route handler or handler validation.
   * @note `apiVersion` is a reserved query parameter, avoid using it
   * @public
   * @default false
   */
  enableQueryVersion?: boolean;
};

/**
 * Create an {@link VersionedRoute | versioned route}.
 *
 * @param config - The route configuration
 * @returns A versioned route
 * @public
 */
export type VersionedRouteRegistrar<Method extends RouteMethod, Ctx extends RqCtx = RqCtx> = (
  config: VersionedRouteConfig<Method>
) => VersionedRoute<Method, Ctx>;

/**
 * A router, very similar to {@link IRouter} that will return an {@link VersionedRoute}
 * instead.
 *
 * @example
 * const versionedRoute = versionedRouter
 *   .post({
 *     access: 'internal',
 *     path: '/api/my-app/foo/{id?}',
 *     options: { timeout: { payload: 60000 } },
 *   })
 *   .addVersion(
 *     {
 *       version: '1',
 *       validate: {
 *         request: {
 *           query: schema.object({
 *             name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
 *           }),
 *           params: schema.object({
 *             id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
 *           }),
 *           body: schema.object({ foo: schema.string() }),
 *         },
 *         response: {
 *           200: {
 *             body: schema.object({ foo: schema.string() }),
 *           },
 *         },
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
 *         request: {
 *           query: schema.object({
 *             name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
 *           }),
 *           params: schema.object({
 *             id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
 *           }),
 *           body: schema.object({ fooString: schema.string() }),
 *         },
 *         response: {
 *           200: {
 *             body: schema.object({ fooName: schema.string() }),
 *           },
 *         },
 *       },
 *     },
 *     async (ctx, req, res) => {
 *       await ctx.fooService.create(req.body.fooString, req.params.id, req.query.name);
 *       return res.ok({ body: { fooName: req.body.fooString } });
 *     }
 *   )
 *   // BREAKING CHANGES: Enforce min/max length on fooString
 *   .addVersion(
 *     {
 *       version: '3',
 *       validate: {
 *         request: {
 *           query: schema.object({
 *             name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
 *           }),
 *           params: schema.object({
 *             id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
 *           }),
 *           body: schema.object({ fooString: schema.string({ minLength: 0, maxLength: 1000 }) }),
 *         },
 *         response: {
 *           200: {
 *             body: schema.object({ fooName: schema.string() }),
 *           },
 *         },
 *       },
 *     },
 *     async (ctx, req, res) => {
 *       await ctx.fooService.create(req.body.fooString, req.params.id, req.query.name);
 *       return res.ok({ body: { fooName: req.body.fooString } });
 *     }
 *   );

 * @public
 */
export interface VersionedRouter<Ctx extends RqCtx = RqCtx> {
  /**
   * @public
   * @track-adoption
   */
  get: VersionedRouteRegistrar<'get', Ctx>;
  /**
   * @public
   * @track-adoption
   */
  put: VersionedRouteRegistrar<'put', Ctx>;
  /**
   * @public
   * @track-adoption
   */
  post: VersionedRouteRegistrar<'post', Ctx>;
  /**
   * @public
   * @track-adoption
   */
  patch: VersionedRouteRegistrar<'patch', Ctx>;
  /**
   * @public
   * @track-adoption
   */
  delete: VersionedRouteRegistrar<'delete', Ctx>;
}

/** @public */
export type VersionedRouteRequestValidation<P, Q, B> = RouteValidatorFullConfigRequest<P, Q, B>;

/** @public */
export interface VersionedRouteResponseValidation {
  [statusCode: number]: { body: RouteValidationFunction<unknown> | Type<unknown> };
  unsafe?: { body?: boolean };
}

/**
 * Versioned route validation
 * @public
 */
export interface FullValidationConfig<P, Q, B> {
  /**
   * Validation to run against route inputs: params, query and body
   * @public
   */
  request?: VersionedRouteRequestValidation<P, Q, B>;
  /**
   * Validation to run against route output
   * @note This validation is only intended to run in development. Do not use this
   *       for setting default values!
   * @public
   */
  response?: VersionedRouteResponseValidation;
}

/**
 * Options for a versioned route. Probably needs a lot more options like sunsetting
 * of an endpoint etc.
 * @public
 */
export interface AddVersionOpts<P, Q, B> {
  /**
   * Version to assign to this route
   * @public
   */
  version: ApiVersion;
  /**
   * Validation for this version of a route
   * @public
   */
  validate: false | FullValidationConfig<P, Q, B> | (() => FullValidationConfig<P, Q, B>); // Provide a way to lazily load validation schemas
}

/**
 * A versioned route
 * @public
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
   * @public
   */
  addVersion<P = unknown, Q = unknown, B = unknown>(
    options: AddVersionOpts<P, Q, B>,
    handler: (...params: Parameters<RequestHandler<P, Q, B, Ctx>>) => MaybePromise<IKibanaResponse>
  ): VersionedRoute<Method, Ctx>;
}
