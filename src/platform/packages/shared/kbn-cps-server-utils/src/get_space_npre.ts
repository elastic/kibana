/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/spaces-utils';
import type { ScopeableUrlRequest } from '@kbn/core-elasticsearch-server';

/**
 * Get the NPRE for a given space ID or a request carrying a URL.
 *
 * When a request object is provided, the space is taken from a URL pathname via
 * {@link getSpaceIdFromPath}. If the request has a `rewrittenUrl` (set by core
 * when the first `onPreRouting` handler returns `rewriteUrl`), that URL is
 * used instead of `url`. This matches HTTP requests after the Spaces plugin
 * strips `/s/:spaceId` from `request.url` during pre-routing: the original
 * browser path (including the space segment) remains on `rewrittenUrl`.
 *
 * **Server base path**: {@link getSpaceIdFromPath} is called with the pathname
 * only; a non-root `server.basePath` is not stripped here. CPS is only
 * available on Serverless, where custom base paths are not used, so this
 * limitation is not a practical concern for CPS.
 *
 * @param spaceIdOrRequest - Space ID string, or a `ScopeableUrlRequest` (incoming
 *   `KibanaRequest` / synthetic `UrlRequest` from `@kbn/core-elasticsearch-server`).
 * @returns The NPRE
 * @throws {Error} if a Request-like object without a `url` is provided.
 *   This is not expected in normal use but guards against JavaScript callers
 *   bypassing the type system.
 */
export function getSpaceNPRE(spaceIdOrRequest: string | ScopeableUrlRequest): string {
  if (typeof spaceIdOrRequest === 'string') {
    return `@kibana_space_${spaceIdOrRequest || DEFAULT_SPACE_ID}_default`;
  }

  const request = spaceIdOrRequest as ScopeableUrlRequest;
  const url =
    'rewrittenUrl' in request && request.rewrittenUrl ? request.rewrittenUrl : request.url;
  if (!url) {
    throw new Error(`Cannot determine space NPRE: the Request object is missing a 'url' property.`);
  }
  return `@kibana_space_${getSpaceIdFromPath(url.pathname).spaceId}_default`;
}
