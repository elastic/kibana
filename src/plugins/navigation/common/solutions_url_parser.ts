/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const solutionContextRegexString = '/n/([a-z0-9_\\-]+)';
const solutionContextRegex = new RegExp(solutionContextRegexString);

/**
 * Given a server base path, solution id, and requested resource, this will construct a space-aware path
 * that includes a URL identifier with the solution id.
 *
 * @param basePath the server's base path.
 * @param solutionId the solution id.
 * @param requestedPath the requested path (e.g. `/app/dashboard`).
 * @returns the solution-aware version of the requested path, inclusive of the server's base path.
 */
export function addSolutionIdToPath(
  basePath: string = '/',
  solutionId?: string | null,
  requestedPath: string = ''
): string {
  if (requestedPath && !requestedPath.startsWith('/')) {
    throw new Error(`path must start with a /`);
  }

  const normalizedBasePath = stripSolutionIdFromPath(
    basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  );

  if (solutionId) {
    return `${normalizedBasePath}/n/${solutionId}${requestedPath}`;
  }
  return `${normalizedBasePath}${requestedPath}` || '/';
}

export function getSolutionIdFromPath(
  requestBasePath?: string | null,
  serverBasePath?: string | null
): { solutionId: string | null; pathHasExplicitSolutionIdentifier: boolean } {
  if (requestBasePath == null) requestBasePath = '/';
  if (serverBasePath == null) serverBasePath = '/';
  const pathToCheck: string = stripServerBasePath(requestBasePath, serverBasePath);

  // Look for `/n/solution-url-context` in the base path
  const matchResult = pathToCheck.match(solutionContextRegex);

  if (!matchResult || matchResult.length === 0) {
    return {
      solutionId: null,
      pathHasExplicitSolutionIdentifier: false,
    };
  }

  // Ignoring first result, we only want the capture group result at index 1
  const [, solutionId] = matchResult;

  if (!solutionId) {
    throw new Error(`Unable to determine Solution ID from request path: ${requestBasePath}`);
  }

  return {
    solutionId,
    pathHasExplicitSolutionIdentifier: true,
  };
}

export function stripSolutionIdFromPath(path: string): string {
  const regex = new RegExp(solutionContextRegexString, 'g');
  return path.replaceAll(regex, '');
}

function stripServerBasePath(requestBasePath: string, serverBasePath: string) {
  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    return requestBasePath.slice(serverBasePath.length);
  }
  return requestBasePath;
}
