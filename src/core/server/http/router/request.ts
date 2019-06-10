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

import { Url } from 'url';
import { ObjectType, TypeOf } from '@kbn/config-schema';
import { Request } from 'hapi';

import { deepFreeze, RecursiveReadonly } from '../../../utils';
import { filterHeaders, Headers } from './headers';
import { RouteMethod, RouteSchemas, RouteConfigOptions } from './route';

const requestSymbol = Symbol('request');

/**
 * Request specific route information exposed to a handler.
 * @public
 * */
export interface KibanaRequestRoute {
  path: string;
  method: RouteMethod | 'patch' | 'options';
  options: Required<RouteConfigOptions>;
}

/**
 * Kibana specific abstraction for an incoming request.
 * @public
 * */
export class KibanaRequest<Params = unknown, Query = unknown, Body = unknown> {
  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   * @internal
   */
  public static from<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    req: Request,
    routeSchemas?: RouteSchemas<P, Q, B>
  ) {
    const requestParts = KibanaRequest.validate(req, routeSchemas);
    return new KibanaRequest(req, requestParts.params, requestParts.query, requestParts.body);
  }

  /**
   * Validates the different parts of a request based on the schemas defined for
   * the route. Builds up the actual params, query and body object that will be
   * received in the route handler.
   */
  private static validate<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    req: Request,
    routeSchemas: RouteSchemas<P, Q, B> | undefined
  ): {
    params: TypeOf<P>;
    query: TypeOf<Q>;
    body: TypeOf<B>;
  } {
    if (routeSchemas === undefined) {
      return {
        body: {},
        params: {},
        query: {},
      };
    }

    const params =
      routeSchemas.params === undefined ? {} : routeSchemas.params.validate(req.params);

    const query = routeSchemas.query === undefined ? {} : routeSchemas.query.validate(req.query);

    const body = routeSchemas.body === undefined ? {} : routeSchemas.body.validate(req.payload);

    return { query, params, body };
  }

  public readonly headers: Headers;
  public readonly url: Url;
  public readonly route: RecursiveReadonly<KibanaRequestRoute>;

  /** @internal */
  protected readonly [requestSymbol]: Request;

  constructor(
    request: Request,
    readonly params: Params,
    readonly query: Query,
    readonly body: Body
  ) {
    this.headers = request.headers;
    this.url = request.url;

    this[requestSymbol] = request;
    this.route = deepFreeze(this.getRouteInfo());
  }

  public getFilteredHeaders(headersToKeep: string[]) {
    return filterHeaders(this.headers, headersToKeep);
  }

  private getRouteInfo() {
    const request = this[requestSymbol];
    return {
      path: request.path,
      method: request.method,
      options: {
        authRequired: request.route.settings.auth !== false,
        tags: request.route.settings.tags || [],
      },
    };
  }
}

/**
 * Returns underlying Hapi Request object for KibanaRequest
 * @internal
 */
export const toRawRequest = (request: KibanaRequest) => request[requestSymbol];
