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

import { ObjectType } from '@kbn/config-schema';
/**
 * The set of common HTTP methods supported by Kibana routing.
 * @public
 */
export type RouteMethod = 'get' | 'post' | 'put' | 'delete';

/**
 * Additional route options.
 * @public
 */
export interface RouteConfigOptions {
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
}

/**
 * Route specific configuration.
 * @public
 */
export interface RouteConfig<P extends ObjectType, Q extends ObjectType, B extends ObjectType> {
  /**
   * The endpoint _within_ the router path to register the route. E.g. if the
   * router is registered at `/elasticsearch` and the route path is `/search`,
   * the full path for the route is `/elasticsearch/search`.
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
   * You *must* specify a validation schema to be able to read:
   *   - url path segments
   *   - request query
   *   - request body
   * To opt out of validating the request, specify `false`.
   * @example
   * ```ts
   *  import { schema } from '@kbn/config-schema';
   *  router.get({
   *   path: 'path/{id}'
   *   validate: {
   *     params: schema.object({
   *       id: schema.string(),
   *     }),
   *     query: schema.object({...}),
   *     body: schema.object({...}),
   *   },
   *  })
   * ```
   */
  validate: RouteSchemas<P, Q, B> | false;

  /**
   * Additional route options {@link RouteConfigOptions}.
   */
  options?: RouteConfigOptions;
}

/**
 * RouteSchemas contains the schemas for validating the different parts of a
 * request.
 * @public
 */
export interface RouteSchemas<P extends ObjectType, Q extends ObjectType, B extends ObjectType> {
  params?: P;
  query?: Q;
  body?: B;
}
