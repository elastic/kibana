/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RemoveIndexSignatures } from '@kbn/utility-types';
import type { RouteValidator } from './route_validator';

/**
 * The set of valid body.output
 * @public
 */
export const validBodyOutput = ['data', 'stream'] as const;

/**
 * Set of HTTP methods changing the state of the server.
 * @public
 */
export type DestructiveRouteMethod = 'post' | 'put' | 'delete' | 'patch';

/**
 * Set of HTTP methods not changing the state of the server.
 * @public
 */
export type SafeRouteMethod = 'get' | 'options';

/**
 * The set of common HTTP methods supported by Kibana routing.
 * @public
 */
export type RouteMethod = SafeRouteMethod | DestructiveRouteMethod;

/**
 * The set of supported parseable Content-Types
 * @public
 */
export type RouteContentType =
  | 'application/json'
  | 'application/*+json'
  | 'application/octet-stream'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/*';

/**
 * Additional body options for a route
 * @public
 */
export interface RouteConfigOptionsBody {
  /**
   * A string or an array of strings with the allowed mime types for the endpoint. Use this settings to limit the set of allowed mime types. Note that allowing additional mime types not listed
   * above will not enable them to be parsed, and if parse is true, the request will result in an error response.
   *
   * Default value: allows parsing of the following mime types:
   * * application/json
   * * application/*+json
   * * application/octet-stream
   * * application/x-www-form-urlencoded
   * * multipart/form-data
   * * text/*
   */
  accepts?: RouteContentType | RouteContentType[] | string | string[];

  /**
   * A mime type string overriding the 'Content-Type' header value received.
   */
  override?: string;

  /**
   * Limits the size of incoming payloads to the specified byte count. Allowing very large payloads may cause the server to run out of memory.
   *
   * Default value: The one set in the kibana.yml config file under the parameter `server.maxPayload`.
   */
  maxBytes?: number;

  /**
   * The processed payload format. The value must be one of:
   * * 'data' - the incoming payload is read fully into memory. If parse is true, the payload is parsed (JSON, form-decoded, multipart) based on the 'Content-Type' header. If parse is false, a raw
   * Buffer is returned.
   * * 'stream' - the incoming payload is made available via a Stream.Readable interface. If the payload is 'multipart/form-data' and parse is true, field values are presented as text while files
   * are provided as streams. File streams from a 'multipart/form-data' upload will also have a hapi property containing the filename and headers properties. Note that payload streams for multipart
   * payloads are a synthetic interface created on top of the entire multipart content loaded into memory. To avoid loading large multipart payloads into memory, set parse to false and handle the
   * multipart payload in the handler using a streaming parser (e.g. pez).
   *
   * Default value: 'data', unless no validation.body is provided in the route definition. In that case the default is 'stream' to alleviate memory pressure.
   */
  output?: (typeof validBodyOutput)[number];

  /**
   * Determines if the incoming payload is processed or presented raw. Available values:
   * * true - if the request 'Content-Type' matches the allowed mime types set by allow (for the whole payload as well as parts), the payload is converted into an object when possible. If the
   * format is unknown, a Bad Request (400) error response is sent. Any known content encoding is decoded.
   * * false - the raw payload is returned unmodified.
   * * 'gunzip' - the raw payload is returned unmodified after any known content encoding is decoded.
   *
   * Default value: true, unless no validation.body is provided in the route definition. In that case the default is false to alleviate memory pressure.
   */
  parse?: boolean | 'gunzip';
}

/**
 * Route access level.
 *
 * Public routes are stable and intended for external access and are subject to
 * stricter change management and have long term maintenance windows.
 *
 * @remark as of 9.0, access to internal routes is restricted by default. See https://github.com/elastic/kibana/issues/163654.
 */
export type RouteAccess = 'public' | 'internal';

/**
 * @remark When providing a deprecation description like: "Use Y instead" ensure
 *         that the string contains no dynamically computed parts.
 *
 * @remark this is limited to interfaces with well-defined interfaces, Re
 */
export type RouteDeprecationDescription<O = unknown> = O extends unknown[]
  ? // Unwrap arrays
    RouteDeprecationDescription<O[number]>
  : O extends Map<unknown, unknown>
  ? // Map is not supported
    never
  : O extends object
  ? {
      [K in keyof RemoveIndexSignatures<O>]?: string | RouteDeprecationDescription<O[K]>;
    }
  : string;

/**
 * Declare route input deprecations.
 */
export interface RouteInputDeprecation<P = unknown, Q = unknown, B = unknown> {
  query?: RouteDeprecationDescription<P>;
  params?: RouteDeprecationDescription<Q>;
  body?: RouteDeprecationDescription<B>;
}

/**
 * Description of deprecations for this HTTP API.
 *
 * @remark This will assist Kibana HTTP API users when upgrading to new versions
 * of the Elastic stack (via Upgrade Assistant) and will be surfaced in documentation
 * created from HTTP API introspection (like OAS).
 *
 * string - Provide a string to mark this route as deprecated along with a description like:
 *          "This route is deprecated and staged for removal by X.X.X. Use /another/cool/route instead"
 * boolean - Set this to `true` to specify that this entire route is deprecated.
 *
 * It's also possible to provide deprecation messages about sub-parts of the route. Consider this
 * example of a route deprecating an enum value from its request body:
 *
 * ```ts
 * {
 *   body: {
 *     foo: {
 *       type: { check: (v) => v === "bar", message : "'bar' is deprecated. Use 'qux' or 'baz' instead." }
 *     }
 *   }
 * }
 * ```
 *
 * @default false
 * @public
 */
export type RouteDeprecation<P = unknown, Q = unknown, B = unknown> =
  | boolean
  | string
  | RouteInputDeprecation<P, Q, B>;

/**
 * Additional route options.
 * @public
 */
export interface RouteConfigOptions<
  Method extends RouteMethod,
  P = unknown,
  Q = unknown,
  B = unknown
> {
  /**
   * Defines authentication mode for a route:
   * - true. A user has to have valid credentials to access a resource
   * - false. A user can access a resource without any credentials.
   * - 'optional'. A user can access a resource, and will be authenticated if provided credentials are valid.
   *               Can be useful when we grant access to a resource but want to identify a user if possible.
   *
   * Defaults to `true` if an auth mechanism is registered.
   */
  authRequired?: boolean | 'optional';

  /**
   * Defines xsrf protection requirements for a route:
   * - true. Requires an incoming POST/PUT/DELETE request to contain `kbn-xsrf` header.
   * - false. Disables xsrf protection.
   *
   * Set to true by default
   */
  xsrfRequired?: Method extends 'get' ? never : boolean;

  /**
   * Defines intended request origin of the route:
   * - public. The route is public, declared stable and intended for external access.
   *           In the future, may require an incomming request to contain a specified header.
   * - internal. The route is internal and intended for internal access only.
   *
   * Defaults to 'internal' If not declared,
   */
  access?: RouteAccess;

  /**
   * Additional metadata tag strings to attach to the route.
   */
  tags?: readonly string[];

  /**
   * Additional body options {@link RouteConfigOptionsBody}.
   */
  body?: Method extends 'get' | 'options' ? undefined : RouteConfigOptionsBody;

  /**
   * Defines per-route timeouts.
   */
  timeout?: {
    /**
     * Milliseconds to receive the payload
     */
    payload?: Method extends 'get' | 'options' ? undefined : number;

    /**
     * Milliseconds the socket can be idle before it's closed
     */
    idleSocket?: number;
  };

  /**
   * Short summary of this route. Required for all routes used in OAS documentation.
   *
   * @example
   * ```ts
   * router.get({
   *  path: '/api/foo/{id}',
   *  access: 'public',
   *  summary: `Get foo resources for an ID`,
   * })
   * ```
   */
  summary?: string;

  /**
   * Optional API description, which supports [CommonMark](https://spec.commonmark.org) markdown formatting
   *
   * @example
   * ```ts
   * router.get({
   *  path: '/api/foo/{id}',
   *  access: 'public',
   *  summary: `Get foo resources for an ID`,
   *  description: `Foo resources require **X** and **Y** `read` permissions to access.`,
   * })
   * ```
   */
  description?: string;

  /**
   * A description of this routes deprecations.
   *
   * @remarks This may be surfaced in OAS documentation.
   */
  deprecated?: RouteDeprecation<P, Q, B>;

  /**
   * Release version or date that this route will be removed
   * Use with `deprecated: true`
   *
   * @remarks This will be surfaced in OAS documentation.
   * @example 9.0.0
   */
  discontinued?: string;
}

/**
 * Route specific configuration.
 * @public
 */
export interface RouteConfig<P, Q, B, Method extends RouteMethod> {
  /**
   * The endpoint _within_ the router path to register the route.
   *
   * @remarks
   * E.g. if the router is registered at `/elasticsearch` and the route path is
   * `/search`, the full path for the route is `/elasticsearch/search`.
   * Supports:
   *   - named path segments `path/{name}`.
   *   - optional path segments `path/{position?}`.
   *   - multi-segments `path/{coordinates*2}`.
   * Segments are accessible within a handler function as `params` property of {@link KibanaRequest} object.
   * To have read access to `params` you *must* specify validation schema with {@link RouteConfig.validate}.
   */
  path: string;

  /**
   * A schema created with `@kbn/config-schema` that every request will be validated against.
   *
   * @remarks
   * You *must* specify a validation schema to be able to read:
   *   - url path segments
   *   - request query
   *   - request body
   * To opt out of validating the request, specify `validate: false`. In this case
   * request params, query, and body will be **empty** objects and have no
   * access to raw values.
   * In some cases you may want to use another validation library. To do this, you need to
   * instruct the `@kbn/config-schema` library to output **non-validated values** with
   * setting schema as `schema.object({}, { unknowns: 'allow' })`;
   *
   * @example
   * ```ts
   *  import { schema } from '@kbn/config-schema';
   *  router.get({
   *   path: 'path/{id}',
   *   validate: {
   *     params: schema.object({
   *       id: schema.string(),
   *     }),
   *     query: schema.object({...}),
   *     body: schema.object({...}),
   *   },
   * },
   * (context, req, res,) {
   *   req.params; // type Readonly<{id: string}>
   *   console.log(req.params.id); // value
   * });
   *
   * router.get({
   *   path: 'path/{id}',
   *   validate: false, // handler has no access to params, query, body values.
   * },
   * (context, req, res,) {
   *   req.params; // type Readonly<{}>;
   *   console.log(req.params.id); // undefined
   * });
   *
   * router.get({
   *   path: 'path/{id}',
   *   validate: {
   *     // handler has access to raw non-validated params in runtime
   *     params: schema.object({}, { unknowns: 'allow' })
   *   },
   * },
   * (context, req, res,) {
   *   req.params; // type Readonly<{}>;
   *   console.log(req.params.id); // value
   *   myValidationLibrary.validate({ params: req.params });
   * });
   * ```
   */
  validate: RouteValidator<P, Q, B> | (() => RouteValidator<P, Q, B>) | false;

  /**
   * Additional route options {@link RouteConfigOptions}.
   */
  options?: RouteConfigOptions<Method, P, Q, B>;
}
