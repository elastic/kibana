/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/spaces-utils';

/**
 * Derive the CPS space NPRE from the per-request base path (e.g. from the core
 * HTTP `basePath.get(request)` value) and the server base path.
 *
 * After the Spaces `onPreRouting` interceptor, `request.url.pathname` no longer
 * contains `/s/:spaceId`; the space URL context lives on the HTTP base path
 * instead. This helper matches Spaces service space-id resolution.
 */
export function getSpaceNPREFromBasePath(requestBasePath: string, serverBasePath: string): string {
  const { spaceId } = getSpaceIdFromPath(requestBasePath, serverBasePath);
  return `@kibana_space_${spaceId}_default`;
}

/**
 * Get the NPRE for a given space ID or a request carrying a URL.
 *
 * When a request object is provided, the space is extracted from the URL pathname.
 *
 * **Note**: For HTTP requests that have been rewritten by the Spaces plugin, the
 * pathname no longer includes `/s/:spaceId`. Prefer {@link getSpaceNPREFromBasePath}
 * with the HTTP base path service's `get(request)` and `serverBasePath` in that case.
 *
 * **Assumption**: this function assumes that the server base path is `/` (the
 * default). If Kibana is configured with a custom `server.basePath`, the base
 * path prefix will not be stripped before matching the space segment, causing
 * the function to always fall back to the default space. CPS is a
 * Serverless-only feature and Serverless deployments always run at the root
 * path, so this is not a practical concern today.
 *
 * @param spaceIdOrRequest - The space ID string, or an object with a `url: URL` property
 * @returns The NPRE
 * @throws {Error} if a Request-like object without a `url` is provided.
 *   This is not expected in normal use but guards against JavaScript callers
 *   bypassing the type system.
 */
export function getSpaceNPRE(spaceIdOrRequest: string | { url: URL }): string {
  if (typeof spaceIdOrRequest === 'string') {
    return `@kibana_space_${spaceIdOrRequest || DEFAULT_SPACE_ID}_default`;
  }
  // Explicitly widen to URL | undefined so the defensive check below is valid.
  const url: URL | undefined = spaceIdOrRequest.url;
  if (!url) {
    throw new Error(`Cannot determine space NPRE: the Request object is missing a 'url' property.`);
  }
  return `@kibana_space_${getSpaceIdFromPath(url.pathname).spaceId}_default`;
}
