/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_SPACE_ID } from './constants';

const spaceContextRegex = /^\/s\/([a-z0-9_\-]+)/;

/**
 * Extracts the space id from the given path.
 *
 * @param requestBasePath The base path of the current request.
 * @param serverBasePath The server's base path.
 * @returns the space id.
 *
 * @internal
 */
export function getSpaceIdFromPath(
  requestBasePath?: string | null,
  serverBasePath?: string | null
): { spaceId: string; pathHasExplicitSpaceIdentifier: boolean } {
  if (requestBasePath == null) requestBasePath = '/';
  if (serverBasePath == null) serverBasePath = '/';
  const pathToCheck: string = stripServerBasePath(requestBasePath, serverBasePath);

  // Look for `/s/space-url-context` in the base path
  const matchResult = pathToCheck.match(spaceContextRegex);

  if (!matchResult || matchResult.length === 0) {
    return {
      spaceId: DEFAULT_SPACE_ID,
      pathHasExplicitSpaceIdentifier: false,
    };
  }

  // Ignoring first result, we only want the capture group result at index 1
  const [, spaceId] = matchResult;

  if (!spaceId) {
    throw new Error(`Unable to determine Space ID from request path: ${requestBasePath}`);
  }

  return {
    spaceId,
    pathHasExplicitSpaceIdentifier: true,
  };
}

/**
 * Given a server base path, space id, and requested resource, this will construct a space-aware path
 * that includes a URL identifier with the space id.
 *
 * @param basePath the server's base path.
 * @param spaceId the space id.
 * @param requestedPath the requested path (e.g. `/app/dashboard`).
 * @returns the space-aware version of the requested path, inclusive of the server's base path.
 */
export function addSpaceIdToPath(
  basePath: string = '/',
  spaceId: string = '',
  requestedPath: string = ''
): string {
  if (requestedPath && !requestedPath.startsWith('/')) {
    throw new Error(`path must start with a /`);
  }

  const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

  if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
    return `${normalizedBasePath}/s/${spaceId}${requestedPath}`;
  }
  return `${normalizedBasePath}${requestedPath}` || '/';
}

function stripServerBasePath(requestBasePath: string, serverBasePath: string) {
  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    return requestBasePath.substr(serverBasePath.length);
  }
  return requestBasePath;
}
