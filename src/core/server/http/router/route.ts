/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { RouteValidatorFullConfig } from './validator';

/**
 * The set of common HTTP methods supported by Kibana routing.
 * @public
 */
export type RouteMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options';

/**
 * The set of valid body.output
 * @public
 */
export const validBodyOutput = ['data', 'stream'] as const;

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
   * Limits the size of incoming payloads to the specified byte count. Allowing very large payloads may cause the server to run out of memory.
   *
   * Default value: The one set in the kibana.yml config file under the parameter `server.maxPayloadBytes`.
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
  output?: typeof validBodyOutput[number];

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
 * Additional route options.
 * @public
 */
export interface RouteConfigOptions<Method extends RouteMethod> {
  /**
   * A flag shows that authentication for a route:
   * `enabled`  when true
   * `disabled` when false
   *
   * Enabled by default.
   */
  authRequired?: boolean;

  /**
   * Additional metadata tag strings to attach to the route.
   */
  tags?: readonly string[];

  /**
   * Additional body options {@link RouteConfigOptionsBody}.
   */
  body?: Method extends 'get' | 'options' ? undefined : RouteConfigOptionsBody;
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
   * setting schema as `schema.object({}, { allowUnknowns: true })`;
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
   *     params: schema.object({}, { allowUnknowns: true })
   *   },
   * },
   * (context, req, res,) {
   *   req.params; // type Readonly<{}>;
   *   console.log(req.params.id); // value
   *   myValidationLibrary.validate({ params: req.params });
   * });
   * ```
   */
  validate: RouteValidatorFullConfig<P, Q, B> | false;

  /**
   * Additional route options {@link RouteConfigOptions}.
   */
  options?: RouteConfigOptions<Method>;
}
