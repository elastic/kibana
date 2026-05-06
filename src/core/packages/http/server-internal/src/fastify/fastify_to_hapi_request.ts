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
import type { Request as HapiRequest } from '@hapi/hapi';
import type {
  KibanaRouteOptions,
  RouteAuthc,
  RouteSecurity,
  RouterRoute,
} from '@kbn/core-http-server';

/**
 * {@link CoreKibanaRequest} param validation (config-schema ObjectType) requires a
 * Joi-style plain object. Fastify and find-my-way may expose `params` as proxies or
 * null-prototype objects, which fail with "expected a plain object value".
 *
 * @internal
 */
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
  const protocol =
    (fastifyReq.headers[':scheme'] as string | undefined) ??
    ((fastifyReq.raw.socket as { encrypted?: boolean })?.encrypted ? 'https' : 'http');
  const hostHeader =
    (fastifyReq.headers.host as string | undefined) ??
    (fastifyReq.headers[':authority'] as string | undefined) ??
    'localhost';

  // Fastify's `url` is "/path?qs"; build a full URL so consumers (CoreKibanaRequest)
  // can read pathname/searchParams without further normalization.
  let url: URL;
  try {
    url = new URL(fastifyReq.url, `${protocol}://${hostHeader}`);
  } catch {
    url = new URL(`${protocol}://${hostHeader}/`);
  }

  const app = ((fastifyReq as any).app = (fastifyReq as any).app ?? {});
  app.requestId = app.requestId ?? fastifyReq.id ?? '';
  app.requestUuid = app.requestUuid ?? '';

  const security =
    typeof routeApp.security === 'function' ? undefined : (routeApp.security as RouteSecurity);
  const settingsAuth = mapRouteSecurityToHapiAuthSettings(security, authRegistered);

  // Note: we rely on `request.raw.req`/`request.raw.res` being a real Node IncomingMessage
  // and ServerResponse so `CoreKibanaRequest` recognizes the request as a "real" request
  // and resolves request.events from the underlying socket.
  const compat: any = {
    app,
    url,
    headers: fastifyReq.headers,
    method: String(fastifyReq.method ?? '').toLowerCase(),
    params: toPlainRouteParams(fastifyReq.params),
    query: fastifyReq.query ?? {},
    payload: fastifyReq.body,
    path: url.pathname,
    raw: {
      req: fastifyReq.raw,
      res: fastifyReply.raw,
    },
    auth: { isAuthenticated: false },
    info: { host: hostHeader, referrer: '' },
    route: {
      method: String(fastifyReq.method ?? '').toLowerCase(),
      path: route.path,
      settings: {
        app: routeApp,
        tags: route.options.tags ? Array.from(route.options.tags) : [],
        auth: settingsAuth,
        payload: route.options.body,
      },
    },
  };

  return compat as HapiRequest;
}
