/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-http-server';

const spaceContextRegex = /^\/s\/([a-z0-9_\-]+)/;

/**
 * Extracts the space id from the given path.
 *
 * This is Core's internal copy of the logic from `@kbn/spaces-utils`.
 * `@kbn/spaces-utils` will be removed once all consumers migrate to
 * `request.spaceId` (Phase 2).
 *
 * @param requestBasePath The base path of the current request.
 * @param serverBasePath The server's base path.
 * @returns the space id and whether the path had an explicit space identifier.
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

function stripServerBasePath(requestBasePath: string, serverBasePath: string) {
  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    return requestBasePath.slice(serverBasePath.length);
  }
  return requestBasePath;
}
