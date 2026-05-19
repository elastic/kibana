/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The ID used by Kibana to identify the default space.
 * Copied from `@kbn/spaces-utils` so that Core internals do not depend on that package.
 * @kbn/spaces-utils re-exports this constant for backward compatibility during Phase 2 migration.
 * @internal
 */
export const DEFAULT_SPACE_ID = 'default';

const spaceContextRegex = /^\/s\/([a-z0-9_\-]+)/;

/**
 * Extracts the space ID from the given URL path.
 * Copied from `@kbn/spaces-utils` so that Core internals do not depend on that package.
 * @internal
 */
export function getSpaceIdFromPath(
  requestBasePath?: string | null,
  serverBasePath?: string | null
): { spaceId: string; pathHasExplicitSpaceIdentifier: boolean } {
  if (requestBasePath == null) requestBasePath = '/';
  if (serverBasePath == null) serverBasePath = '/';
  const pathToCheck = stripServerBasePath(requestBasePath, serverBasePath);

  const matchResult = pathToCheck.match(spaceContextRegex);

  if (!matchResult || matchResult.length === 0) {
    return {
      spaceId: DEFAULT_SPACE_ID,
      pathHasExplicitSpaceIdentifier: false,
    };
  }

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
 * Constructs a space-aware path.
 * Copied from `@kbn/spaces-utils` so that Core internals do not depend on that package.
 * @internal
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
