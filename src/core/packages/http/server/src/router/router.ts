/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi';
import type Boom from '@hapi/boom';
import type { VersionedRouter } from '../versioning';
import type { RouteAccess, RouteConfig, RouteDeprecationInfo, RouteMethod } from './route';
import type { RequestHandler, RequestHandlerWrapper } from './request_handler';
import type { RequestHandlerContextBase } from './request_handler_context';
import type { RouteConfigOptions } from './route';
import type { RouteValidator } from './route_validator';
import type { InternalRouteSecurity } from './request';

/**
 * Route handler common definition
 *
 * @public
 */
export type RouteRegistrar<
  Method extends RouteMethod,
  Context extends RequestHandlerContextBase = RequestHandlerContextBase
> = <P, Q, B>(
  route: RouteConfig<P, Q, B, Method>,
  handler: RequestHandler<P, Q, B, Context, Method>
) => void;

/**
 * Registers route handlers for specified resource path and method.
 * See {@link RouteConfig} and {@link RequestHandler} for more information about arguments to route registrations.
 *
 * @public
 */
export interface IRouter<Context extends RequestHandlerContextBase = RequestHandlerContextBase> {
  /**
   * Resulted path
   */
  routerPath: string;

  /**
   * Register a route handler for `GET` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   *
   * @track-adoption
   */
  get: RouteRegistrar<'get', Context>;

  /**
   * Register a route handler for `POST` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   *
   * @track-adoption
   */
  post: RouteRegistrar<'post', Context>;

  /**
   * Register a route handler for `PUT` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   *
   * @track-adoption
   */
  put: RouteRegistrar<'put', Context>;

  /**
   * Register a route handler for `PATCH` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   *
   * @track-adoption
   */
  patch: RouteRegistrar<'patch', Context>;

  /**
   * Register a route handler for `DELETE` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   *
   * @track-adoption
   */
  delete: RouteRegistrar<'delete', Context>;

  /**
   * Wrap a router handler to catch and converts legacy boom errors to proper custom errors.
   * @param handler {@link RequestHandler} - a route handler to wrap
   */
  handleLegacyErrors: RequestHandlerWrapper;

  /**
   * Returns all routes registered with this router.
   * @returns List of registered routes.
   * @internal
   */
  getRoutes: (options?: { excludeVersionedRoutes?: boolean }) => RouterRoute[];

  /**
   * An instance very similar to {@link IRouter} that can be used for versioning HTTP routes
   * following the Elastic versioning specification.
   *
   * @example
   * const router = core.http.createRouter();
   * router.versioned.get({ path: '/api/my-path', access: 'public' }).addVersion(
   *   {
   *     version: '1',
   *     validate: false,
   *   },
   *   async (ctx, req, res) => {
   *     return res.ok();
   *   }
   * );
   *
   * @experimental
   */
  versioned: VersionedRouter<Context>;
}

/** @public */
export interface RouterRoute {
  method: RouteMethod;
  path: string;
  options: RouteConfigOptions<RouteMethod>;
  security?: InternalRouteSecurity;
  /**
   * @note if providing a function to lazily load your validation schemas assume
   *       that the function will only be called once.
   */
  validationSchemas?:
    | (() => RouteValidator<unknown, unknown, unknown>)
    | RouteValidator<unknown, unknown, unknown>
    | false;
  handler: (
    req: Request,
    responseToolkit: ResponseToolkit
  ) => Promise<ResponseObject | Boom.Boom<any>>;
  isVersioned: boolean;
}

/**
 * A query-string parameter accepted by a registered route, derived from its query
 * validation schema.
 *
 * Carries just enough metadata to power autocomplete (e.g. Dev Tools Console) without
 * serializing the full validation schema. Returned as part of {@link RegisteredRouteInfo}
 * when query parameters are requested.
 *
 * @public
 */
export interface RegisteredRouteQueryParameter {
  /** The query parameter name, e.g. `perPage`. */
  name: string;
  /** Whether the parameter is required by the route's validation schema. */
  required: boolean;
  /**
   * The closed set of values the parameter accepts, when the schema constrains it to an
   * enumeration. Omitted for free-form parameters.
   */
  options?: string[];
  /** `true` when the parameter is a boolean flag (i.e. accepts `true`/`false`). */
  flag?: boolean;
}

/**
 * Lightweight, serializable description of a route registered with the HTTP service.
 *
 * Exposes only routing metadata (path, method, access tier, etc.) and intentionally
 * omits handlers and validation schemas, making it cheap to enumerate every registered
 * route. Returned by {@link HttpServiceSetup.getRegisteredRoutes}.
 *
 * @public
 */
export interface RegisteredRouteInfo {
  /** The path the route is registered on, e.g. `/api/spaces/space/{id}`. */
  path: string;
  /** The HTTP method the route responds to. */
  method: RouteMethod;
  /**
   * The intended consumer tier of the route. Defaults to `internal` when a route
   * does not explicitly declare its access level.
   */
  access: RouteAccess;
  /** A human-readable description of the route, when one was provided at registration. */
  description?: string;
  /** Whether the route was registered through the versioned router. */
  isVersioned: boolean;
  /**
   * The route's query-string parameters, derived from its query validation schema.
   * Only populated when {@link GetRegisteredRoutesOptions.includeQueryParameters} is
   * requested, since extracting them is more expensive than reading routing metadata.
   */
  queryParams?: RegisteredRouteQueryParameter[];
}

/**
 * Options for {@link HttpServiceSetup.getRegisteredRoutes}.
 *
 * @public
 */
export interface GetRegisteredRoutesOptions {
  /**
   * When `true`, each route's query-string parameters are extracted from its validation
   * schema and returned on {@link RegisteredRouteInfo.queryParams}. This is more expensive
   * than the default metadata-only enumeration, so callers opt in only when needed.
   *
   * @default false
   */
  includeQueryParameters?: boolean;
}

/** @public */
export interface RouterDeprecatedApiDetails {
  routeDeprecationOptions?: RouteDeprecationInfo;
  routeMethod: RouteMethod;
  routePath: string;
  routeVersion?: string;
  routeAccess?: RouteAccess;
}

/** @public */
export interface RouterRouteDeprecatedApiDetails extends RouterDeprecatedApiDetails {
  routeAccess: 'public';
  routeDeprecationOptions: RouteDeprecationInfo;
}

/** @public */
export interface RouterAccessDeprecatedApiDetails extends RouterDeprecatedApiDetails {
  routeAccess: 'internal';
  routeDeprecationOptions?: RouteDeprecationInfo;
}
