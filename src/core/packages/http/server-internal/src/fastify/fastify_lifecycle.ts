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
  OnPreResponseToolkit,
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
import { KIBANA_HAPI_COMPAT_REQUEST } from './fastify_auth';
import {
  getKibanaCompatRequestUrl,
  mapRouteSecurityToHapiAuthSettings,
  toPlainRouteParams,
} from './fastify_to_hapi_request';
import { isReplyCommitted } from './fastify_reply_utils';

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
const buildKibanaRequest = (req: FastifyRequest, reply: FastifyReply): HapiRequest => {
  const existingCompat = (req as any).app?.[KIBANA_HAPI_COMPAT_REQUEST] as HapiRequest | undefined;
  if (existingCompat) {
    return existingCompat;
  }

  const hostHeader =
    (req.headers.host as string | undefined) ??
    (req.headers[':authority'] as string | undefined) ??
    'localhost';
  const url = getKibanaCompatRequestUrl(req);
  // Reuse the per-request `app` slot if a previous hook (e.g. the route handler's
  // own builder) populated it; otherwise initialize it once.
  const app = ((req as any).app = (req as any).app ?? { requestId: req.id ?? '', requestUuid: '' });
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
  const settingsApp = (
    matchedKibanaOptions
      ? {
          ...matchedKibanaOptions,
          security: matchedKibanaOptions.security ?? matchedRoute?.security,
        }
      : matched
      ? {
          xsrfRequired: undefined,
          access: undefined,
          deprecated: undefined,
          security: matched.security,
        }
      : {}
  ) as KibanaRouteOptions;
  const authRegistered =
    typeof (req.server as any).getKibanaAuthRegistered === 'function'
      ? Boolean((req.server as any).getKibanaAuthRegistered())
      : false;
  const mergedSecurity = settingsApp.security;
  const routeSecurity =
    typeof mergedSecurity === 'function'
      ? undefined
      : (mergedSecurity as RouteSecurity | undefined);
  const compat: any = {
    app,
    url,
    headers: req.headers,
    method: String(req.method ?? '').toLowerCase(),
    params: toPlainRouteParams((req as any).params),
    query: (req as any).query ?? {},
    payload: (req as any).body,
    path: url.pathname,
    // `reply.raw` is required so {@link CoreKibanaRequest} wires `request.events.completed$`
    // from the response `close` event (e.g. Security Solution limited-concurrency onPreAuth).
    raw: { req: req.raw, res: reply.raw },
    auth: { isAuthenticated: false },
    info: { host: hostHeader, referrer: '' },
    route: {
      method: matched?.method ?? String(req.method ?? '').toLowerCase(),
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

const sendInternalError = (reply: FastifyReply, log: Logger): FastifyReply | void => {
  if (isReplyCommitted(reply)) {
    log.error(new Error('HTTP lifecycle handler failed after the response was already committed'));
    return;
  }
  return reply.code(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An internal server error occurred. Check Kibana server logs for details.',
  });
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
      return sendInternalError(reply, log);
    }
  };
}

/** @internal */
export function adoptToFastifyOnPreAuth(fn: OnPreAuthHandler, log: Logger) {
  return async function preAuth(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply | void> {
    try {
      const result = await fn(
        CoreKibanaRequest.from(buildKibanaRequest(req, reply)),
        lifecycleResponseFactory,
        preAuthToolkit
      );
      if (isKibanaResponse(result)) {
        await adapter.handle(result, reply);
        return reply;
      }
      if (result.type === OnPreAuthResultType.next) {
        return;
      }
      throw new Error(
        `Unexpected result from OnPreAuth. Expected OnPreAuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      return sendInternalError(reply, log);
    }
  };
}

/** @internal */
export function adoptToFastifyOnPostAuth(fn: OnPostAuthHandler, log: Logger) {
  return async function postAuth(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply | void> {
    try {
      const result = await fn(
        CoreKibanaRequest.from(buildKibanaRequest(req, reply)),
        lifecycleResponseFactory,
        postAuthToolkit
      );
      if (isKibanaResponse(result)) {
        await adapter.handle(result, reply);
        return reply;
      }
      if (result.type === OnPostAuthResultType.next) {
        return;
      }
      if (result.type === OnPostAuthResultType.authzResult) {
        const app = (req as any).app ?? ((req as any).app = {});
        Object.defineProperty(app, 'authzResult', {
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
      return sendInternalError(reply, log);
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
        { statusCode },
        preResponseToolkit
      );
      if (result.type === OnPreResponseResultType.next) {
        if (result.headers) {
          for (const [name, value] of Object.entries(result.headers)) {
            if (value !== undefined) reply.header(name, value);
          }
        }
        return payload;
      }
      if (result.type === OnPreResponseResultType.render) {
        if (result.headers) {
          for (const [name, value] of Object.entries(result.headers)) {
            if (value !== undefined) reply.header(name, value);
          }
        }
        return result.body;
      }
      throw new Error(
        `Unexpected result from OnPreResponse. Expected OnPreResponseResult, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      if (!isReplyCommitted(reply)) {
        sendInternalError(reply, log);
      }
      return payload;
    }
  };
}
