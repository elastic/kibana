/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type SpaceId, asSpaceId, DEFAULT_SPACE_ID, getSpaceUrlPrefix } from './space_id';

const spaceContextRegex = /^\/s\/([a-z0-9_\-]+)/;

/**
 * Extracts the space id from the given path.
 *
 * @param requestBasePath The base path of the current request.
 * @param serverBasePath The server's base path.
 * @returns the space id and whether the path had an explicit space identifier.
 */
export function getSpaceIdFromPath(
  requestBasePath: string = '/',
  serverBasePath: string = '/'
): { spaceId: SpaceId; pathname: string; hasExplicitSpaceIdentifier: boolean } {
  const pathToCheck = stripServerBasePath(requestBasePath, serverBasePath);
  const match = pathToCheck.match(spaceContextRegex);

  if (!match) {
    return { spaceId: DEFAULT_SPACE_ID, pathname: pathToCheck, hasExplicitSpaceIdentifier: false };
  }

  const spaceId = asSpaceId(match[1]);
  return {
    spaceId,
    pathname: pathToCheck.slice(match[0].length) || '/',
    hasExplicitSpaceIdentifier: true,
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
  const spacePrefix = spaceId ? getSpaceUrlPrefix(asSpaceId(spaceId)) : '';
  return `${normalizedBasePath}${spacePrefix}${requestedPath}` || '/';
}

function stripServerBasePath(requestBasePath: string, serverBasePath: string): string {
  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    return requestBasePath.slice(serverBasePath.length);
  }
  return requestBasePath;
}
