/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpaceId } from '@kbn/core-spaces-common';
import { asSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

const spaceContextRegex = /^\/s\/([a-z0-9_\-]+)/;

/**
 * Extracts the space id from the given path.
 *
 *
 * @param requestBasePath The base path of the current request.
 * @param serverBasePath The server's base path.
 * @returns the space id and whether the path had an explicit space identifier.
 *
 * @internal
 */
export function getSpaceIdFromPath(
  requestBasePath: string = '/',
  serverBasePath: string = '/'
): { spaceId: SpaceId; pathHasExplicitSpaceIdentifier: boolean } {
  const pathToCheck = stripServerBasePath(requestBasePath, serverBasePath);
  const match = pathToCheck.match(spaceContextRegex);

  if (!match) {
    return { spaceId: DEFAULT_SPACE_ID, pathHasExplicitSpaceIdentifier: false };
  }

  return { spaceId: asSpaceId(match[1]), pathHasExplicitSpaceIdentifier: true };
}

function stripServerBasePath(requestBasePath: string, serverBasePath: string): string {
  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    return requestBasePath.slice(serverBasePath.length);
  }
  return requestBasePath;
}
