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

import { ObjectType, TypeOf } from '@kbn/config-schema';
import { Request } from 'hapi';

import { filterHeaders, Headers } from './headers';
import { RouteSchemas } from './route';

/** @public */
export class KibanaRequest<Params = unknown, Query = unknown, Body = unknown> {
  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   */
  public static from<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    req: Request,
    routeSchemas: RouteSchemas<P, Q, B> | undefined
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
  public readonly path: string;

  constructor(
    private readonly request: Request,
    readonly params: Params,
    readonly query: Query,
    readonly body: Body
  ) {
    this.headers = request.headers;
    this.path = request.path;
  }

  public getFilteredHeaders(headersToKeep: string[]) {
    return filterHeaders(this.headers, headersToKeep);
  }

  // eslint-disable-next-line @typescript-eslint/camelcase
  public unstable_getIncomingMessage() {
    return this.request.raw.req;
  }
}
