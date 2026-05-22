/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { URL } from 'url';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from '@kbn/logging';
import type {
  KibanaRouteOptions,
  RouteSecurity,
  KibanaRequestState,
  OnPostAuthHandler,
  OnPostAuthToolkit,
  OnPreAuthHandler,
  OnPreAuthToolkit,
  OnPreResponseHandler,
  OnPreResponseInfo,
  OnPreResponseToolkit,
  ResponseHeaders,
  OnPreRoutingHandler,
  OnPreRoutingToolkit,
  RouterRoute,
} from '@kbn/core-http-server';
import {
  isKibanaResponse,
  OnPostAuthResultType,
  OnPreAuthResultType,
  OnPreResponseResultType,
  OnPreRoutingResultType,
} from '@kbn/core-http-server';
import { CoreKibanaRequest, lifecycleResponseFactory } from '@kbn/core-http-router-server-internal';
import { deepFreeze } from '@kbn/std';
import type { Request as HapiRequest } from '@hapi/hapi';
import { FastifyResponseAdapter } from './fastify_response_adapter';
import { KIBANA_HAPI_COMPAT_REQUEST } from './fastify_request_compat_symbol';
import { kibanaRouteOptionsFromRouterRoute } from './fastify_route_lookup';
import {
  getKibanaCompatRequestUrl,
  coercePayloadForUnparsedStreamRoute,
  mapRouteSecurityToHapiAuthSettings,
  toPlainQuery,
  toPlainRouteParams,
} from './fastify_to_hapi_request';
import { findHeadersIntersection } from '../lifecycle/on_pre_response';
import { isReplyCommitted } from './fastify_reply_utils';

/** Set when a `preParsing` lifecycle hook has already sent a response (cannot return `reply` there). */
export const KIBANA_LIFECYCLE_SHORT_CIRCUITED = Symbol('kibanaLifecycleShortCircuited');

const markLifecycleShortCircuited = (req: FastifyRequest): void => {
  const app = ((req as { app?: Record<symbol, boolean> }).app =
    (req as { app?: Record<symbol, boolean> }).app ?? {});
  app[KIBANA_LIFECYCLE_SHORT_CIRCUITED] = true;
};

export const isLifecycleShortCircuited = (req: FastifyRequest): boolean =>
  Boolean((req as { app?: Record<symbol, boolean> }).app?.[KIBANA_LIFECYCLE_SHORT_CIRCUITED]);

const preRoutingToolkit: OnPreRoutingToolkit = {
  next: () => ({ type: OnPreRoutingResultType.next }),
  rewriteUrl: (url: string) => ({ type: OnPreRoutingResultType.rewriteUrl, url }),
};
const preAuthToolkit: OnPreAuthToolkit = {
  next: () => ({ type: OnPreAuthResultType.next }),
};
const postAuthToolkit: OnPostAuthToolkit = {
  next: () => ({ type: OnPostAuthResultType.next }),
  authzResultNext: (authzResult: Record<string, boolean>) => ({
    type: OnPostAuthResultType.authzResult,
    authzResult,
  }),
};
const preResponseToolkit: OnPreResponseToolkit = {
  render: (responseRender: { headers?: Record<string, string | string[]>; body?: any }) => ({
    type: OnPreResponseResultType.render,
    body: responseRender.body,
    headers: responseRender.headers,
  }),
  next: (responseExtensions?: { headers?: Record<string, string | string[]> }) => ({
    type: OnPreResponseResultType.next,
    headers: responseExtensions?.headers,
  }),
};

/**
 * Lifecycle hooks run before Fastify's normal route handler invokes our internal
 * builder, so we have to assemble a Hapi-shaped request here too. The route-lookup
 * {@link populateMatchedRouteFromFindMyWay} (Fastify `preParsing`, after `onPreRouting`
 * URL rewrites) stashes the matched route on `req.app.matchedRoute`; this builder reads
 * that to populate `route.settings.app` so consumers like the security plugin can read
 * `KibanaRequest.route.options.security`.
 */
const getAuthRegistered = (req: FastifyRequest): boolean =>
  typeof (req.server as any).getKibanaAuthRegistered === 'function'
    ? Boolean((req.server as any).getKibanaAuthRegistered())
    : false;

const resolveSettingsAppFromMatchedRoute = (
  matchedRoute: RouterRoute | undefined,
  matchedKibanaOptions: KibanaRouteOptions | undefined
): KibanaRouteOptions => {
  if (matchedRoute) {
    return {
      ...kibanaRouteOptionsFromRouterRoute(matchedRoute),
      ...(matchedKibanaOptions ?? {}),
      security: matchedRoute.security,
    } as KibanaRouteOptions;
  }
  return (matchedKibanaOptions ?? {}) as KibanaRouteOptions;
};

/** Keeps a cached Hapi-compat request in sync with the current URL, body, and matched route. */
const syncHapiCompatRouteMetadata = (
  compat: HapiRequest,
  req: FastifyRequest,
  reply: FastifyReply,
  app: Record<string, unknown>,
  authRegistered: boolean
): void => {
  const hostHeader =
    (req.headers.host as string | undefined) ??
    (req.headers[':authority'] as string | undefined) ??
    'localhost';
  const url = getKibanaCompatRequestUrl(req);
  const matched = app.matchedRoute as
    | {
        method: string;
        path: string;
        options: { tags?: readonly string[]; body?: unknown };
        security?: unknown;
      }
    | undefined;
  const matchedKibanaOptions = app.matchedKibanaRouteOptions as KibanaRouteOptions | undefined;
  const matchedRoute = matched as RouterRoute | undefined;
  const settingsApp = resolveSettingsAppFromMatchedRoute(matchedRoute, matchedKibanaOptions);
  const routeSecurity =
    typeof settingsApp.security === 'function'
      ? undefined
      : (settingsApp.security as RouteSecurity | undefined);
  const compatRecord = compat as any;
  compatRecord.url = url;
  compatRecord.path = url.pathname;
  compatRecord.headers = req.headers;
  compatRecord.method = String(req.method ?? '').toLowerCase();
  compatRecord.params = toPlainRouteParams((req as { params?: unknown }).params);
  compatRecord.query = toPlainQuery((req as { query?: Record<string, unknown> }).query);
  compatRecord.payload = coercePayloadForUnparsedStreamRoute(
    matchedRoute ?? { options: {} },
    (req as { body?: unknown }).body
  );
  compatRecord.info.host = hostHeader;
  compatRecord.route = {
    method: String(matched?.method ?? req.method ?? '').toLowerCase(),
    path: matched?.path ?? url.pathname,
    settings: {
      app: settingsApp,
      tags: matched?.options.tags ? Array.from(matched.options.tags) : [],
      auth: mapRouteSecurityToHapiAuthSettings(routeSecurity, authRegistered),
      payload: {
        ...(matchedRoute?.options.body ?? {}),
        ...(matchedRoute?.options.timeout?.payload !== undefined
          ? { timeout: matchedRoute.options.timeout.payload }
          : {}),
      },
    },
  };
};

/** @internal */
export const buildKibanaRequest = (req: FastifyRequest, reply: FastifyReply): HapiRequest => {
  const app = ((req as any).app = (req as any).app ?? { requestId: req.id ?? '', requestUuid: '' });
  // Always refresh: lifecycle hooks and auth may reuse a cached compat request across phases.
  app.fastifyReply = reply;

  const existingCompat = app[KIBANA_HAPI_COMPAT_REQUEST] as HapiRequest | undefined;
  if (existingCompat) {
    syncHapiCompatRouteMetadata(existingCompat, req, reply, app, getAuthRegistered(req));
    return existingCompat;
  }

  const hostHeader =
    (req.headers.host as string | undefined) ??
    (req.headers[':authority'] as string | undefined) ??
    'localhost';
  const url = getKibanaCompatRequestUrl(req);
  const matched = app.matchedRoute as
    | {
        method: string;
        path: string;
        options: { tags?: readonly string[]; body?: unknown };
        security?: unknown;
      }
    | undefined;
  const matchedKibanaOptions = app.matchedKibanaRouteOptions as KibanaRouteOptions | undefined;
  const matchedRoute = matched as RouterRoute | undefined;
  const settingsApp = resolveSettingsAppFromMatchedRoute(matchedRoute, matchedKibanaOptions);
  const authRegistered = getAuthRegistered(req);
  const routeSecurity =
    typeof settingsApp.security === 'function'
      ? undefined
      : (settingsApp.security as RouteSecurity | undefined);
  const compat: any = {
    app,
    url,
    headers: req.headers,
    method: String(req.method ?? '').toLowerCase(),
    params: toPlainRouteParams((req as any).params),
    query: toPlainQuery((req as any).query),
    payload: (req as any).body,
    path: url.pathname,
    // `reply.raw` is required so {@link CoreKibanaRequest} wires `request.events.completed$`
    // from the response `close` event (e.g. Security Solution limited-concurrency onPreAuth).
    raw: { req: req.raw, res: reply.raw },
    auth: { isAuthenticated: false },
    info: { host: hostHeader, referrer: '' },
    route: {
      method: String(matched?.method ?? req.method ?? '').toLowerCase(),
      path: matched?.path ?? url.pathname,
      settings: {
        app: settingsApp,
        tags: matched?.options.tags ? Array.from(matched.options.tags) : [],
        auth: mapRouteSecurityToHapiAuthSettings(routeSecurity, authRegistered),
        payload: {
          ...(matchedRoute?.options.body ?? {}),
          ...(matchedRoute?.options.timeout?.payload !== undefined
            ? { timeout: matchedRoute.options.timeout.payload }
            : {}),
        },
      },
    },
  };
  return compat as HapiRequest;
};

const adapter = new FastifyResponseAdapter();

const INTERNAL_ERROR_BODY = {
  statusCode: 500,
  error: 'Internal Server Error',
  message: 'An internal server error occurred. Check Kibana server logs for details.',
};

const sendInternalError = async (
  reply: FastifyReply,
  log: Logger
): Promise<FastifyReply | void> => {
  if (isReplyCommitted(reply)) {
    log.error(new Error('HTTP lifecycle handler failed after the response was already committed'));
    return;
  }
  return reply.code(500).type('application/json; charset=utf-8').send(INTERNAL_ERROR_BODY);
};

/** preParsing/preHandler hooks must not return the Fastify reply object (that is treated as a new payload stream). */
const shortCircuitLifecycle = async (
  reply: FastifyReply,
  handle: () => Promise<unknown>
): Promise<void> => {
  await handle();
};

/** @internal */
export function adoptToFastifyOnPreRouting(fn: OnPreRoutingHandler, log: Logger) {
  return async function preRouting(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply | void> {
    try {
      const result = await fn(
        CoreKibanaRequest.from(buildKibanaRequest(req, reply)),
        lifecycleResponseFactory,
        preRoutingToolkit
      );
      if (isKibanaResponse(result)) {
        await adapter.handle(result, reply);
        // Returning the reply tells Fastify the response has been handled so it stops
        // walking the request lifecycle. Without it, Fastify proceeds to route matching
        // and would respond 404 on top of our short-circuit.
        return reply;
      }
      if (result.type === OnPreRoutingResultType.next) {
        return;
      }
      if (result.type === OnPreRoutingResultType.rewriteUrl) {
        const appState = (req as any).app as KibanaRequestState | undefined;
        if (appState) {
          // Mirror Hapi `on_pre_routing`: preserve the incoming URL before rewriting the request.
          appState.rewrittenUrl =
            appState.rewrittenUrl ?? new URL(getKibanaCompatRequestUrl(req), 'http://internal/');
        }
        // Fastify exposes the underlying Node IncomingMessage on `req.raw`; updating its
        // url before the framework picks a route is the analogue of Hapi's `request.setUrl`.
        req.raw.url = result.url;
        return;
      }
      throw new Error(
        `Unexpected result from OnPreRouting. Expected OnPreRoutingResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      markLifecycleShortCircuited(req);
      await sendInternalError(reply, log);
      return reply;
    }
  };
}

/** @internal */
export function adoptToFastifyOnPreAuth(fn: OnPreAuthHandler, log: Logger) {
  return async function preAuth(
    req: FastifyRequest,
    reply: FastifyReply,
    payload: unknown
  ): Promise<unknown> {
    const app = (req as { app?: { matchedRoute?: unknown } }).app;
    // Catch-all Fastify routing runs lifecycle hooks before the dispatcher 404s unregistered paths.
    if (!app?.matchedRoute) {
      return payload === undefined ? Buffer.alloc(0) : payload;
    }
    try {
      const result = await fn(
        CoreKibanaRequest.from(buildKibanaRequest(req, reply)),
        lifecycleResponseFactory,
        preAuthToolkit
      );
      if (isKibanaResponse(result)) {
        await shortCircuitLifecycle(reply, () => adapter.handle(result, reply));
        markLifecycleShortCircuited(req);
        return payload === undefined ? Buffer.alloc(0) : payload;
      }
      if (result.type === OnPreAuthResultType.next) {
        return payload === undefined ? Buffer.alloc(0) : payload;
      }
      throw new Error(
        `Unexpected result from OnPreAuth. Expected OnPreAuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      markLifecycleShortCircuited(req);
      await sendInternalError(reply, log);
      return payload === undefined ? Buffer.alloc(0) : payload;
    }
  };
}

/** @internal */
export function adoptToFastifyOnPostAuth(fn: OnPostAuthHandler, log: Logger) {
  return async function postAuth(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply | void> {
    const app = (req as { app?: { matchedRoute?: unknown } }).app;
    if (!app?.matchedRoute) {
      return;
    }
    try {
      const result = await fn(
        CoreKibanaRequest.from(buildKibanaRequest(req, reply)),
        lifecycleResponseFactory,
        postAuthToolkit
      );
      if (isKibanaResponse(result)) {
        await shortCircuitLifecycle(reply, () => adapter.handle(result, reply));
        return reply;
      }
      if (result.type === OnPostAuthResultType.next) {
        return;
      }
      if (result.type === OnPostAuthResultType.authzResult) {
        const reqApp = (req as any).app ?? ((req as any).app = {});
        Object.defineProperty(reqApp, 'authzResult', {
          value: deepFreeze(result.authzResult),
          configurable: false,
          writable: false,
          enumerable: false,
        });
        return;
      }
      throw new Error(
        `Unexpected result from OnPostAuth. Expected OnPostAuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      await sendInternalError(reply, log);
      return reply;
    }
  };
}

/** @internal */
export function adoptToFastifyOnPreResponse(fn: OnPreResponseHandler, log: Logger) {
  return async function preResponse(
    req: FastifyRequest,
    reply: FastifyReply,
    payload: unknown
  ): Promise<unknown> {
    try {
      const statusCode = reply.statusCode;
      const result = await fn(
        CoreKibanaRequest.from(buildKibanaRequest(req, reply)),
        {
          statusCode,
          headers: reply.getHeaders() as OnPreResponseInfo['headers'],
        },
        preResponseToolkit
      );
      if (result.type === OnPreResponseResultType.next) {
        if (result.headers) {
          findHeadersIntersection(reply.getHeaders() as ResponseHeaders, result.headers, log);
          for (const [name, value] of Object.entries(result.headers)) {
            if (value !== undefined) reply.header(name, value);
          }
        }
        return payload;
      }
      if (result.type === OnPreResponseResultType.render) {
        if (result.headers) {
          findHeadersIntersection(reply.getHeaders() as ResponseHeaders, result.headers, log);
          for (const [name, value] of Object.entries(result.headers)) {
            if (value !== undefined) reply.header(name, value);
          }
        }
        if (typeof result.body === 'string') {
          const trimmedBody = result.body.trimStart();
          if (trimmedBody.startsWith('<!DOCTYPE') || trimmedBody.startsWith('<html')) {
            // Route handlers may have already set `application/json` on 401 before onPreResponse
            // rewrites the body to the unauthenticated HTML page (Hapi overwrites the type).
            reply.type('text/html; charset=utf-8');
          }
        }
        return result.body;
      }
      throw new Error(
        `Unexpected result from OnPreResponse. Expected OnPreResponseResult, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      reply.code(500);
      reply.type('application/json; charset=utf-8');
      return JSON.stringify(INTERNAL_ERROR_BODY);
    }
  };
}
