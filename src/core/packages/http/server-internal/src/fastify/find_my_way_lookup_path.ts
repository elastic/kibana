/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
 * Redirect target when the client sent a trailing slash (Hapi parity: 302 to the slashless path).
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
