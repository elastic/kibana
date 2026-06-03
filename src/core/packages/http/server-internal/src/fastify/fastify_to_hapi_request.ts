/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';
import { URL } from 'url';
import { Readable } from 'node:stream';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Request as HapiRequest } from '@hapi/hapi';
import type {
  KibanaRouteOptions,
  RouteAuthc,
  RouteSecurity,
  RouterRoute,
} from '@kbn/core-http-server';
import { routeHasUnparsedPayload, routeWantsStreamPayload } from './fastify_route_body_options';
import { getRequestAcceptEncoding } from './install_fastify_compression';

/**
 * {@link CoreKibanaRequest} param validation (config-schema ObjectType) requires a
 * Joi-style plain object. Fastify and find-my-way may expose `params` as proxies or
 * null-prototype objects, which fail with "expected a plain object value".
 *
 * @internal
 */
/** Plain object copy for config-schema validation (Fastify may use null-prototype query objects). */
export function toPlainQuery(input: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const key of Object.keys(input as Record<string, unknown>)) {
      out[key] = (input as Record<string, unknown>)[key];
    }
  }
  return out;
}

export function toPlainRouteParams(input: unknown): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const key of Object.keys(input as Record<string, unknown>)) {
      out[key] = (input as Record<string, string | undefined>)[key];
    }
  }
  return out;
}

/**
 * Prefer {@link IncomingMessage.url} (`fastifyReq.raw.url`) when building the WHATWG URL:
 * `registerOnPreRouting` handlers (notably Spaces) rewrite it via `rewriteUrl`, but Fastify's
 * `req.url` may remain the pre-rewrite value — {@link CoreKibanaRequest} must see the same
 * pathname/search as Hapi after `setUrl`.
 *
 * @internal
 */
export function getKibanaCompatRequestUrl(fastifyReq: FastifyRequest): URL {
  const protocol =
    (fastifyReq.headers[':scheme'] as string | undefined) ??
    ((fastifyReq.raw.socket as { encrypted?: boolean })?.encrypted ? 'https' : 'http');
  const hostHeader =
    (fastifyReq.headers.host as string | undefined) ??
    (fastifyReq.headers[':authority'] as string | undefined) ??
    'localhost';

  const relative =
    typeof fastifyReq.raw.url === 'string' && fastifyReq.raw.url.length > 0
      ? fastifyReq.raw.url
      : fastifyReq.url;

  try {
    return new URL(relative, `${protocol}://${hostHeader}`);
  } catch {
    return new URL(`${protocol}://${hostHeader}/`);
  }
}

/**
 * Maps Kibana route security to Hapi `route.settings.auth`, matching
 * {@link HttpServer}'s `getAuthOption(this.getSecurity(route)?.authc?.enabled)` +
 * `registerAuth` semantics. When `authc` is omitted, returns `undefined` (same as
 * `auth: undefined` on a Hapi route before server defaults merge).
 *
 * @internal
 */
export function mapRouteSecurityToHapiAuthSettings(
  security: RouteSecurity | undefined,
  authRegistered: boolean
): false | { mode: 'required' | 'try' } | undefined {
  if (!authRegistered) {
    return undefined;
  }
  const authc = security?.authc as RouteAuthc | undefined;
  if (authc === undefined) {
    return undefined;
  }
  const enabled = authc.enabled;
  if (enabled === false) {
    return false;
  }
  if (enabled === 'optional') {
    return { mode: 'try' };
  }
  if (enabled === true || enabled === 'minimal') {
    return { mode: 'required' };
  }
  return undefined;
}

/**
 * Hapi allows `route.settings.auth === false` to disable auth; `@hapi/hapi` types omit that literal.
 *
 * @internal
 */
export function isHapiRouteAuthDisabled(auth: unknown): boolean {
  return auth === false;
}

/**
 * Supertest may POST with `Content-Type: application/json` and body `{}` even when the route
 * declares `parse: false` + `output: 'stream'` (Hapi treated that as an empty stream). Coerce
 * plain objects to an empty Readable before {@link CoreKibanaRequest} stream validation runs.
 */
export function coercePayloadForUnparsedStreamRoute(
  route: Pick<RouterRoute, 'options'>,
  payload: unknown
): unknown {
  if (
    !routeHasUnparsedPayload(route as RouterRoute) ||
    !routeWantsStreamPayload(route as RouterRoute)
  ) {
    return payload;
  }

  if (payload instanceof Readable) {
    return payload;
  }

  if (typeof payload === 'object' && typeof (payload as { pipe?: unknown }).pipe === 'function') {
    return payload;
  }

  if (Buffer.isBuffer(payload)) {
    return Readable.from(payload);
  }

  if (typeof payload === 'string') {
    return Readable.from(Buffer.from(payload));
  }

  if (
    payload === undefined ||
    payload === null ||
    (typeof payload === 'object' && !Array.isArray(payload))
  ) {
    // Hapi stream routes with `parse: false` expose an empty Readable for bodyless POSTs
    // (e.g. Console proxy `.send()`). Fastify's built-in `text/plain` parser and
    // `sanitizeRequest` can otherwise leave a plain object or string that fails `schema.stream()`.
    return Readable.from(Buffer.alloc(0));
  }

  return payload;
}

/**
 * Builds an object that satisfies the subset of the Hapi `Request` interface read by
 * {@link CoreKibanaRequest.from} so the existing Kibana request machinery can be reused
 * unchanged when running on Fastify.
 *
 * This is intentionally a "duck-typed" Hapi request — only the fields actually accessed
 * by `CoreKibanaRequest`/`Router.handle` are populated. The cast back to `HapiRequest`
 * lets the existing internal handler signature stay stable while we incrementally
 * migrate to Fastify.
 *
 * @internal
 */
export function buildHapiCompatRequestFromFastify(
  fastifyReq: FastifyRequest,
  fastifyReply: FastifyReply,
  route: Pick<RouterRoute, 'method' | 'path' | 'options'> & {
    options: RouterRoute['options'];
  },
  routeApp: KibanaRouteOptions,
  authRegistered: boolean
): HapiRequest {
  const hostHeader =
    (fastifyReq.headers.host as string | undefined) ??
    (fastifyReq.headers[':authority'] as string | undefined) ??
    'localhost';
  const url = getKibanaCompatRequestUrl(fastifyReq);

  const app = ((fastifyReq as any).app = (fastifyReq as any).app ?? {});
  app.requestId = app.requestId ?? fastifyReq.id ?? '';
  app.requestUuid = app.requestUuid ?? '';
  app.fastifyReply = fastifyReply;

  const security =
    typeof routeApp.security === 'function' ? undefined : (routeApp.security as RouteSecurity);
  const settingsAuth = mapRouteSecurityToHapiAuthSettings(security, authRegistered);

  // Note: we rely on `request.raw.req`/`request.raw.res` being a real Node IncomingMessage
  // and ServerResponse so `CoreKibanaRequest` recognizes the request as a "real" request
  // and resolves request.events from the underlying socket.
  const preservedAcceptEncoding = getRequestAcceptEncoding(fastifyReq);
  const headers = { ...(fastifyReq.headers as Record<string, unknown>) };
  if (typeof preservedAcceptEncoding === 'string') {
    headers['accept-encoding'] = preservedAcceptEncoding;
  }

  const compat: any = {
    app,
    url,
    headers,
    method: String(fastifyReq.method ?? '').toLowerCase(),
    params: toPlainRouteParams(fastifyReq.params),
    query: toPlainQuery((fastifyReq as { query?: Record<string, unknown> }).query),
    payload: coercePayloadForUnparsedStreamRoute(route, fastifyReq.body),
    path: url.pathname,
    raw: {
      req: fastifyReq.raw,
      res: fastifyReply.raw,
    },
    auth: { isAuthenticated: false },
    info: { host: hostHeader, referrer: '' },
    route: {
      method: String(route.method ?? fastifyReq.method ?? '').toLowerCase(),
      path: route.path,
      settings: {
        app: routeApp,
        tags: route.options.tags ? Array.from(route.options.tags) : [],
        auth: settingsAuth,
        payload: {
          ...(route.options.body ?? {}),
          ...(route.options.timeout?.payload !== undefined
            ? { timeout: route.options.timeout.payload }
            : {}),
        },
      },
    },
  };

  compat.toString = function hapiCompatRequestToString(this: typeof compat) {
    return `[HAPI.Request method="${this.method}" url="${String(this.url)}"]`;
  };
  compat.toJSON = function hapiCompatRequestToJSON(this: typeof compat) {
    return {
      method: this.method,
      url: String(this.url),
    };
  };
  compat[inspect.custom] = compat.toJSON;

  return compat as HapiRequest;
}
