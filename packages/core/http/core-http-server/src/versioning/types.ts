/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Type } from '@kbn/config-schema';
import type { MaybePromise } from '@kbn/utility-types';
import type {
  RouteConfig,
  RouteMethod,
  RequestHandler,
  IKibanaResponse,
  RouteConfigOptions,
  RouteValidatorFullConfig,
  RequestHandlerContextBase,
  RouteValidationFunction,
} from '../..';

type RqCtx = RequestHandlerContextBase;

/**
 * Assuming that version will be a monotonically increasing number where: version > 0.
 * @experimental
 */
export type Version = `${number}`;

/**
 * Configuration for a versioned route
 * @experimental
 */
export type VersionedRouteConfig<Method extends RouteMethod> = Omit<
  RouteConfig<unknown, unknown, unknown, Method>,
  'validate' | 'options'
> & {
  options?: Omit<RouteConfigOptions<Method>, 'access'>;
  /** See {@link RouteConfigOptions<RouteMethod>['access']} */
  access: RouteConfigOptions<Method>['access'];
};

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
}

/** @experimental */
export type RequestValidation<P, Q, B> = RouteValidatorFullConfig<P, Q, B>;

/** @experimental */
export interface ResponseValidation<R> {
  [statusCode: number]: { body: RouteValidationFunction<R> | Type<R> };
  unsafe?: { body?: boolean };
}

/**
 * Versioned route validation
 * @experimental
 */
interface FullValidationConfig<P, Q, B, R> {
  /**
   * Validation to run against route inputs: params, query and body
   * @experimental
   */
  request?: RequestValidation<P, Q, B>;
  /**
   * Validation to run against route output
   * @note This validation is only intended to run in development. Do not use this
   *       for setting default values!
   * @experimental
   */
  response?: ResponseValidation<R>;
}

/**
 * Options for a versioned route. Probably needs a lot more options like sunsetting
 * of an endpoint etc.
 * @experimental
 */
export interface AddVersionOpts<P, Q, B, R> {
  /**
   * Version to assign to this route
   * @experimental
   */
  version: Version;
  /**
   * Validation for this version of a route
   * @experimental
   */
  validate: false | FullValidationConfig<P, Q, B, R>;
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
  addVersion<P = unknown, Q = unknown, B = unknown, R = any>(
    options: AddVersionOpts<P, Q, B, R>,
    handler: (
      ...params: Parameters<RequestHandler<P, Q, B, Ctx>>
    ) => MaybePromise<IKibanaResponse<R>>
  ): VersionedRoute<Method, Ctx>;
}
