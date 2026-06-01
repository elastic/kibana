/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HTTPVersion, Instance as FmwInstance } from 'find-my-way';
import type { FastifyRequest } from 'fastify';

/**
 * Pathname from the raw request URL (no query or hash).
 *
 * @internal
 */
export function getRequestPathname(req: FastifyRequest): string {
  const raw = req.raw.url ?? req.url;
  if (typeof raw !== 'string' || raw === '') {
    return '/';
  }
  const pathOnly = raw.split(/[?#]/, 1)[0];
  if (pathOnly === '') {
    return '/';
  }
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
}

/**
 * Hapi does not treat a trailing slash as an extra path segment (e.g. `/alerts/` does not
 * satisfy `/alerts/{alert_id}`). find-my-way would match with an empty capture unless we
 * normalize first.
 *
 * @internal
 */
export function stripTrailingSlashForFindMyWayLookup(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1) || '/';
  }
  return pathname;
}

/**
 * Path passed to find-my-way `find()`. Must be identical in {@link installFastifyDispatcher}
 * and {@link installRouteLookupHook}: if the hook misses a match, `matchedKibanaRouteOptions`
 * is unset and post-auth treats the route as `access: internal` → 400 from
 * `restrictInternalApis` even when the dispatcher matches and serves the asset.
 *
 * @internal
 */
export function getFindMyWayLookupPath(req: FastifyRequest): string {
  return stripTrailingSlashForFindMyWayLookup(getRequestPathname(req));
}

/**
 * find-my-way lookup with Hapi-style trailing-slash normalization: try the slashless path
 * first (avoids empty named captures on `/alerts/{id}`), then the raw pathname (routes
 * registered as `/prefix/` only match with the slash).
 *
 * @internal
 */
export function findMyWayRouteMatch(
  fmw: FmwInstance<HTTPVersion.V1>,
  method: string,
  req: FastifyRequest
) {
  const pathname = getRequestPathname(req);
  const lookupPath = stripTrailingSlashForFindMyWayLookup(pathname);
  if (pathname !== lookupPath) {
    const slashMatch = fmw.find(method as any, pathname);
    if (slashMatch) {
      return slashMatch;
    }
  }
  return fmw.find(method as any, lookupPath);
}

/**
 * Builds the slashless path (and preserved query) for a request that included a trailing slash.
 * Used by core app `/{path*}` base-path redirects and tests; the global dispatcher must not
 * redirect here — Hapi serves many SPA URLs with a trailing slash without a framework redirect.
 *
 * @internal
 */
export function redirectLocationWithoutTrailingSlash(
  req: FastifyRequest,
  lookupPath: string
): string | undefined {
  const pathname = getRequestPathname(req);
  if (pathname === lookupPath) {
    return undefined;
  }
  const raw = req.raw.url ?? req.url;
  if (typeof raw !== 'string' || !raw.startsWith(pathname)) {
    return lookupPath;
  }
  return `${lookupPath}${raw.slice(pathname.length)}`;
}

/**
 * find-my-way lookup strips trailing slashes, but Hapi wildcard routes (e.g. core `/{path*}`)
 * still expose the slash in `params.path` when the client requested it.
 *
 * @internal
 */
export function restoreTrailingSlashInWildcardParam(
  req: FastifyRequest,
  params: Record<string, string | undefined>,
  wildcardName?: string
): void {
  if (!wildcardName) {
    return;
  }
  const pathname = getRequestPathname(req);
  const lookupPath = stripTrailingSlashForFindMyWayLookup(pathname);
  if (pathname.length <= 1 || !pathname.endsWith('/') || pathname === lookupPath) {
    return;
  }
  const value = params[wildcardName];
  if (value === undefined || value === '') {
    return;
  }
  if (!value.endsWith('/')) {
    params[wildcardName] = `${value}/`;
  }
}

/**
 * find-my-way can still yield empty named captures for unusual paths (e.g. double slashes).
 *
 * @internal
 */
export function routeMatchHasEmptyNamedPathParam(
  params: Record<string, string | undefined>,
  wildcardName?: string
): boolean {
  return Object.entries(params).some(
    ([name, value]) => value === '' && name !== wildcardName && name !== '*' && !name.endsWith('*')
  );
}
