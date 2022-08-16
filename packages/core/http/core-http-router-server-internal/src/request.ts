/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL } from 'url';
import uuid from 'uuid';
// @ts-expect-error: Could not find a declaration file for module 'fastify/lib/request'.
import { Request as FastifyRequestObject } from 'fastify/lib/request';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { fromEvent } from 'rxjs';
import { shareReplay, first, filter } from 'rxjs/operators';
import { RecursiveReadonly } from '@kbn/utility-types';
import { deepFreeze } from '@kbn/std';
import {
  KibanaRequest,
  Headers,
  RouteMethod,
  // validBodyOutput,
  IKibanaSocket,
  RouteValidatorFullConfig,
  KibanaRequestRoute,
  KibanaRequestEvents,
  KibanaRequestAuth,
  KibanaRequestState,
  KibanaRouteOptions,
  KibanaRequestRouteOptions,
} from '@kbn/core-http-server';
// import { isSafeMethod } from './route';
import { KibanaSocket } from './socket';
import { RouteValidator } from './validator';

const requestSymbol = Symbol('request');

/**
 * Core internal implementation of {@link KibanaRequest}
 * @internal
 * @remarks Only publicly exposed for consumers that need to forge requests using {@link CoreKibanaRequest.from}.
 *          All other usages should import and use the {@link KibanaRequest} interface instead.
 */
export class CoreKibanaRequest<
  Params = unknown,
  Query = unknown,
  Body = unknown,
  Method extends RouteMethod = any
> implements KibanaRequest<Params, Query, Body, Method>
{
  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   * @internal
   */
  public static from<P, Q, B>(
    request: FastifyRequest,
    reply: FastifyReply,
    routeSchemas: RouteValidator<P, Q, B> | RouteValidatorFullConfig<P, Q, B> = {},
    withoutSecretHeaders: boolean = true
  ) {
    const routeValidator = RouteValidator.from<P, Q, B>(routeSchemas);
    const requestParts = CoreKibanaRequest.validate(request, routeValidator);
    return new CoreKibanaRequest(
      request,
      reply,
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
    req: FastifyRequest,
    routeValidator: RouteValidator<P, Q, B>
  ): {
    params: P;
    query: Q;
    body: B;
  } {
    const params = routeValidator.getParams(req.params, 'request params');
    const query = routeValidator.getQuery(req.query, 'request query');
    const body = routeValidator.getBody(req.body, 'request body');
    return { query, params, body };
  }

  /** {@inheritDoc IKibanaRequest.id} */
  public readonly id: string;
  /** {@inheritDoc IKibanaRequest.uuid} */
  public readonly uuid: string;
  /** {@inheritDoc IKibanaRequest.url} */
  public readonly url: URL;
  /** {@inheritDoc IKibanaRequest.route} */
  public readonly route: RecursiveReadonly<KibanaRequestRoute<Method>>;
  /** {@inheritDoc IKibanaRequest.headers} */
  public readonly headers: Headers;
  /** {@inheritDoc IKibanaRequest.isSystemRequest} */
  public readonly isSystemRequest: boolean;
  /** {@inheritDoc IKibanaRequest.socket} */
  public readonly socket: IKibanaSocket;
  /** {@inheritDoc IKibanaRequest.events} */
  public readonly events: KibanaRequestEvents;
  /** {@inheritDoc IKibanaRequest.auth} */
  public readonly auth: KibanaRequestAuth;
  /** {@inheritDoc IKibanaRequest.rewrittenUrl} */
  public readonly rewrittenUrl?: URL;

  /** @internal */
  protected readonly [requestSymbol]: FastifyRequest;

  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    public readonly params: Params,
    public readonly query: Query,
    public readonly body: Body,
    // @ts-expect-error we will use this flag as soon as http request proxy is supported in the core
    // until that time we have to expose all the headers
    private readonly withoutSecretHeaders: boolean
  ) {
    // The `request.context.config.requestId` and `request.id` properties will not be populated for requests that are 'faked' by internal systems that leverage
    // KibanaRequest in conjunction with scoped Elasticsearch and SavedObjectsClient in order to pass credentials.
    // In these cases, the ids default to a newly generated UUID.
    const appState = request.context.config as KibanaRequestState;
    this.id = appState.requestId ?? uuid.v4();
    this.uuid = request.id ?? uuid.v4(); // TODO: Is the uuid.v4() fallback needed with Fastify?
    this.rewrittenUrl = appState.rewrittenUrl;

    this.url = new URL(request.url);
    // @ts-expect-error TODO: Figure out how to fix this TS issue
    this.headers = deepFreeze({ ...request.headers });
    this.isSystemRequest = request.headers['kbn-system-request'] === 'true';

    // prevent Symbol exposure via Object.getOwnPropertySymbols()
    Object.defineProperty(this, requestSymbol, {
      value: request,
      enumerable: false,
    });

    this.route = deepFreeze(this.getRouteInfo(request, reply));
    this.socket = new KibanaSocket(request.socket);
    this.events = this.getEvents(reply);

    this.auth = {
      // missing in fakeRequests, so we cast to false
      // @ts-expect-error: Property 'session' does not exist on type FastifyRequest
      isAuthenticated: Boolean(request.session.get('data')), // TODO: Is this really the best way to see if the session is authenticated?
    };
  }

  private getEvents(reply: FastifyReply): KibanaRequestEvents {
    // TODO: Originally in hapi this was `!request.raw.res`, which I guess can happen, but when? In Fastify reply.raw will always be present
    // if (!reply.raw) {
    //   return {
    //     aborted$: NEVER,
    //     completed$: NEVER,
    //   };
    // }

    const completed$ = fromEvent<void>(reply.raw, 'close').pipe(shareReplay(1), first());
    // the response's underlying connection was terminated prematurely
    const aborted$ = completed$.pipe(filter(() => !isCompleted(reply)));

    return {
      aborted$,
      completed$,
    } as const;
  }

  private getRouteInfo(request: FastifyRequest, reply: FastifyReply): KibanaRequestRoute<Method> {
    const method = request.method as Method;
    // TODO: Convert to Fastify
    // const {
    //   parse,
    //   maxBytes,
    //   allow,
    //   output,
    //   timeout: payloadTimeout,
    // } = request.route.settings.payload || {};

    const socketTimeout = request.socket.timeout;
    const options = {
      authRequired: this.getAuthRequired(request),
      xsrfRequired: (reply.context.config as KibanaRouteOptions)?.xsrfRequired ?? true, // some places in LP call KibanaRequest.from(request) manually. remove fallback to true before v8
      tags: (request.context.config as KibanaRouteOptions).tags || [],
      timeout: {
        // payload: payloadTimeout, // TODO: Convert to Fastify
        idleSocket: socketTimeout === 0 ? undefined : socketTimeout,
      },
      // TODO: Convert to Fastify
      // body: isSafeMethod(method)
      //   ? undefined
      //   : {
      //       parse,
      //       maxBytes,
      //       accepts: allow,
      //       output, // TODO: Do we still need this code? `output: output as typeof validBodyOutput[number],` // We do not support all the HAPI-supported outputs and TS complains
      //     },
    } as unknown as KibanaRequestRouteOptions<Method>; // TS does not understand this is OK so I'm enforced to do this enforced casting

    return {
      path: request.url,
      method,
      options,
    };
  }

  private getAuthRequired(request: FastifyRequest) {
    const { authRequired } = request.context.config as KibanaRouteOptions;
    // is `undefined if legacy platform route
    return authRequired === undefined ? true : authRequired;
  }
}

/**
 * Returns underlying Fastify Request
 * @internal
 */
export const ensureRawRequest = (request: KibanaRequest | FastifyRequest) =>
  isKibanaRequest(request) ? request[requestSymbol] : (request as FastifyRequest);

/**
 * Checks if an incoming request is a {@link KibanaRequest}
 * @internal
 */
export function isKibanaRequest(request: unknown): request is CoreKibanaRequest {
  return request instanceof CoreKibanaRequest;
}

function isRequest(request: any): request is FastifyRequest {
  return request instanceof FastifyRequestObject;
}

/**
 * Checks if an incoming request either KibanaRequest or FastifyRequest
 * @internal
 */
export function isRealRequest(request: unknown): request is KibanaRequest | FastifyRequest {
  return isKibanaRequest(request) || isRequest(request);
}

function isCompleted(reply: FastifyReply) {
  return reply.raw.writableFinished;
}
