/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { HTTPVersion as FmwHTTPVersion, Instance as FmwInstance } from 'find-my-way';
import type { KibanaRouteOptions, RouterRoute } from '@kbn/core-http-server';

import { applyHapiCompatRequestTimeouts } from './apply_hapi_compat_request_timeouts';
import { toPlainRouteParams } from './fastify_to_hapi_request';
import { attachFastifyPayloadReceiveTimeout } from './register_fastify_payload_timeout_pre_parsing';

/** @internal */
export type FastifyRouteLookupPathResolver = (req: FastifyRequest) => string;

/** @internal */
export type FastifyStaticDirectoryRouteInfo = ReadonlyMap<string, string | undefined>;

/** @internal */
export type FastifyStaticDirectoryRouteOptions = KibanaRouteOptions;

/** @internal */
export interface PopulateMatchedRouteFromFindMyWayOptions {
  fmw: FmwInstance<FmwHTTPVersion.V1>;
  getLookupPath: FastifyRouteLookupPathResolver;
  staticDirectoryRouteInfo: FastifyStaticDirectoryRouteInfo;
  staticDirectoryRouteOptions: FastifyStaticDirectoryRouteOptions;
  pathnameMatchesWildcardPattern: (pathname: string, pattern: string) => boolean;
  defaultSocketTimeoutMs: number;
}

/**
 * Performs find-my-way lookup and stashes `matchedRoute`, `matchedKibanaRouteOptions`, and
 * route params on `req.app` for lifecycle hooks and the Hapi-compat request builder.
 *
 * Must run from `preParsing` (after `onRequest` {@link registerOnPreRouting} URL rewrites,
 * before body parsing and `onPreAuth`). Hapi matches routes after `onPreRouting`; running
 * lookup earlier left `KibanaRequest.route.options.security` undefined for space-prefixed
 * URLs and broke Security `onPostAuth` authorization.
 *
 * @internal
 */
export function populateMatchedRouteFromFindMyWay(
  req: FastifyRequest,
  reply: FastifyReply,
  options: PopulateMatchedRouteFromFindMyWayOptions
): void {
  const {
    fmw,
    getLookupPath,
    staticDirectoryRouteInfo,
    staticDirectoryRouteOptions,
    pathnameMatchesWildcardPattern,
    defaultSocketTimeoutMs,
  } = options;

  const lookupPath = getLookupPath(req);
  const match = fmw.find(req.method as any, lookupPath);
  const app = ((req as any).app = (req as any).app ?? {});
  let matchedKibanaRoute: RouterRoute | undefined;

  if (match) {
    const store = (match as any).store as
      | {
          kibanaRoute?: RouterRoute;
          kibanaRouteOptions?: KibanaRouteOptions;
          wildcardName?: string;
        }
      | undefined;
    if (store?.kibanaRoute) {
      app.matchedRoute = store.kibanaRoute;
      matchedKibanaRoute = store.kibanaRoute;
    }
    if (store?.kibanaRouteOptions) {
      app.matchedKibanaRouteOptions = store.kibanaRouteOptions;
    } else {
      for (const [pattern] of staticDirectoryRouteInfo) {
        if (pathnameMatchesWildcardPattern(lookupPath, pattern)) {
          app.matchedKibanaRouteOptions = staticDirectoryRouteOptions;
          break;
        }
      }
    }
    const params: Record<string, string | undefined> = { ...(match.params ?? {}) };
    let wildcardName = store?.wildcardName;
    if (!wildcardName) {
      for (const [pattern, wildName] of staticDirectoryRouteInfo) {
        if (pathnameMatchesWildcardPattern(lookupPath, pattern)) {
          wildcardName = wildName;
          break;
        }
      }
    }
    if (wildcardName) {
      if ('*' in params) {
        params[wildcardName] = params['*'];
        delete params['*'];
      } else if (params[wildcardName] === undefined) {
        params[wildcardName] = '';
      }
    }
    const plainParams = toPlainRouteParams(params);
    app.matchedRouteParams = plainParams;
    // Mutate before `preValidation` (registerAuth): auth caches the Hapi-compat request,
    // which snapshots `req.params` for route validation.
    (req as { params: unknown }).params = plainParams;
  } else {
    delete app.matchedRoute;
    delete app.matchedKibanaRouteOptions;
    delete app.matchedRouteParams;
  }

  applyHapiCompatRequestTimeouts(req, reply, matchedKibanaRoute, defaultSocketTimeoutMs);
  attachFastifyPayloadReceiveTimeout(req, reply);
}
