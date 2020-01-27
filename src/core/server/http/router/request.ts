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
import { Request } from 'hapi';
import { Observable, fromEvent, merge } from 'rxjs';
import { shareReplay, first, takeUntil } from 'rxjs/operators';

import { deepFreeze, RecursiveReadonly } from '../../../utils';
import { Headers } from './headers';
import { RouteMethod, RouteConfigOptions, validBodyOutput } from './route';
import { KibanaSocket, IKibanaSocket } from './socket';
import { RouteValidator, RouteValidatorFullConfig } from './validator';

const requestSymbol = Symbol('request');

/**
 * Route options: If 'GET' or 'OPTIONS' method, body options won't be returned.
 * @public
 */
export type KibanaRequestRouteOptions<Method extends RouteMethod> = Method extends 'get' | 'options'
  ? Required<Omit<RouteConfigOptions<Method>, 'body'>>
  : Required<RouteConfigOptions<Method>>;

/**
 * Request specific route information exposed to a handler.
 * @public
 * */
export interface KibanaRequestRoute<Method extends RouteMethod> {
  path: string;
  method: Method;
  options: KibanaRequestRouteOptions<Method>;
}

/**
 * Request events.
 * @public
 * */
export interface KibanaRequestEvents {
  /**
   * Observable that emits once if and when the request has been aborted.
   */
  aborted$: Observable<void>;
}

/**
 * @deprecated
 * `hapi` request object, supported during migration process only for backward compatibility.
 * @public
 */
export interface LegacyRequest extends Request {} // eslint-disable-line @typescript-eslint/no-empty-interface

/**
 * Kibana specific abstraction for an incoming request.
 * @public
 */
export class KibanaRequest<
  Params = unknown,
  Query = unknown,
  Body = unknown,
  Method extends RouteMethod = any
> {
  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   * @internal
   */
  public static from<P, Q, B>(
    req: Request,
    routeSchemas: RouteValidator<P, Q, B> | RouteValidatorFullConfig<P, Q, B> = {},
    withoutSecretHeaders: boolean = true
  ) {
    const routeValidator = RouteValidator.from<P, Q, B>(routeSchemas);
    const requestParts = KibanaRequest.validate(req, routeValidator);
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
   * @internal
   */
  private static validate<P, Q, B>(
    req: Request,
    routeValidator: RouteValidator<P, Q, B>
  ): {
    params: P;
    query: Q;
    body: B;
  } {
    const params = routeValidator.getParams(req.params, 'request params');
    const query = routeValidator.getQuery(req.query, 'request query');
    const body = routeValidator.getBody(req.payload, 'request body');

    return { query, params, body };
  }
  /** a WHATWG URL standard object. */
  public readonly url: Url;
  /** matched route details */
  public readonly route: RecursiveReadonly<KibanaRequestRoute<Method>>;
  /**
   * Readonly copy of incoming request headers.
   * @remarks
   * This property will contain a `filtered` copy of request headers.
   */
  public readonly headers: Headers;

  /** {@link IKibanaSocket} */
  public readonly socket: IKibanaSocket;
  /** Request events {@link KibanaRequestEvents} */
  public readonly events: KibanaRequestEvents;

  /** @internal */
  protected readonly [requestSymbol]: Request;

  constructor(
    request: Request,
    public readonly params: Params,
    public readonly query: Query,
    public readonly body: Body,
    // @ts-ignore we will use this flag as soon as http request proxy is supported in the core
    // until that time we have to expose all the headers
    private readonly withoutSecretHeaders: boolean
  ) {
    this.url = request.url;
    this.headers = deepFreeze({ ...request.headers });

    // prevent Symbol exposure via Object.getOwnPropertySymbols()
    Object.defineProperty(this, requestSymbol, {
      value: request,
      enumerable: false,
    });

    this.route = deepFreeze(this.getRouteInfo(request));
    this.socket = new KibanaSocket(request.raw.req.socket);
    this.events = this.getEvents(request);
  }

  private getEvents(request: Request): KibanaRequestEvents {
    const finish$ = merge(
      fromEvent(request.raw.req, 'end'), // all data consumed
      fromEvent(request.raw.req, 'close') // connection was closed
    ).pipe(shareReplay(1), first());
    return {
      aborted$: fromEvent<void>(request.raw.req, 'aborted').pipe(first(), takeUntil(finish$)),
    } as const;
  }

  private getRouteInfo(request: Request): KibanaRequestRoute<Method> {
    const method = request.method as Method;
    const { parse, maxBytes, allow, output } = request.route.settings.payload || {};

    const options = ({
      authRequired: request.route.settings.auth !== false,
      tags: request.route.settings.tags || [],
      body: ['get', 'options'].includes(method)
        ? undefined
        : {
            parse,
            maxBytes,
            accepts: allow,
            output: output as typeof validBodyOutput[number], // We do not support all the HAPI-supported outputs and TS complains
          },
    } as unknown) as KibanaRequestRouteOptions<Method>; // TS does not understand this is OK so I'm enforced to do this enforced casting

    return {
      path: request.path,
      method,
      options,
    };
  }
}

/**
 * Returns underlying Hapi Request
 * @internal
 */
export const ensureRawRequest = (request: KibanaRequest | LegacyRequest) =>
  isKibanaRequest(request) ? request[requestSymbol] : request;

function isKibanaRequest(request: unknown): request is KibanaRequest {
  return request instanceof KibanaRequest;
}

function isRequest(request: any): request is LegacyRequest {
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
export function isRealRequest(request: unknown): request is KibanaRequest | LegacyRequest {
  return isKibanaRequest(request) || isRequest(request);
}
