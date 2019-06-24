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
import { IncomingMessage } from 'http';
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

const secretHeaders = ['authorization'];
/**
 * Kibana specific abstraction for an incoming request.
 *
 * @remarks
 * The `headers` property will be deprecated and removed in future versions
 * of this class. Please use the `getFilteredHeaders` method to acesss the
 * list of headers available
 *
 * @public
 * */
export class KibanaRequest<Params = unknown, Query = unknown, Body = unknown> {
  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   * @internal
   *
   */
  public static from<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    req: Request,
    routeSchemas?: RouteSchemas<P, Q, B>,
    withoutSecretHeaders: boolean = true
  ) {
    const requestParts = KibanaRequest.validate(req, routeSchemas);
    return new KibanaRequest(
      req,
      requestParts.params,
      requestParts.query,
      requestParts.body,
      withoutSecretHeaders
    );
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

  public readonly url: Url;
  public readonly route: RecursiveReadonly<KibanaRequestRoute>;
  /**
   * This property will be removed in future version of this class, please
   * use the `getFilteredHeaders` method instead
   */
  public readonly headers: Headers;

  /** @internal */
  protected readonly [requestSymbol]: Request;

  constructor(
    request: Request,
    readonly params: Params,
    readonly query: Query,
    readonly body: Body,
    private readonly withoutSecretHeaders: boolean
  ) {
    this.url = request.url;
    this.headers = request.headers;

    // prevent Symbol exposure via Object.getOwnPropertySymbols()
    Object.defineProperty(this, requestSymbol, {
      value: request,
      enumerable: false,
    });

    this.route = deepFreeze(this.getRouteInfo());
  }

  public getFilteredHeaders(headersToKeep: string[]) {
    return filterHeaders(
      this[requestSymbol].headers,
      headersToKeep,
      this.withoutSecretHeaders ? secretHeaders : []
    );
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
 * Returns underlying Hapi Request
 * @internal
 */
export const ensureRawRequest = (request: KibanaRequest | Request) =>
  isKibanaRequest(request) ? request[requestSymbol] : request;

/**
 * Returns http.IncomingMessage that is used an identifier for New Platform KibanaRequest
 * and Legacy platform Hapi Request.
 * Exposed while New platform supports Legacy Platform.
 * @internal
 */
export const getIncomingMessage = (request: KibanaRequest | Request): IncomingMessage => {
  return ensureRawRequest(request).raw.req;
};

function isKibanaRequest(request: unknown): request is KibanaRequest {
  return request instanceof KibanaRequest;
}

function isRequest(request: any): request is Request {
  try {
    return request.raw.req && typeof request.raw.req === 'object';
  } catch {
    return false;
  }
}

/**
 * Checks if an incoming request either KibanaRequest or Legacy.Request
 * @internal
 */
export function isRealRequest(request: unknown): request is KibanaRequest | Request {
  return isKibanaRequest(request) || isRequest(request);
}
