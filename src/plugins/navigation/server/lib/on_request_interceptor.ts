/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CoreSetup,
  KibanaRequest,
  LifecycleResponseFactory,
  OnPreRoutingToolkit,
} from '@kbn/core/server';

const solutionContextRegex = /\/n\/([a-z0-9_\-]+)/;

export interface OnRequestInterceptorDeps {
  http: CoreSetup['http'];
}

export function initSolutionOnRequestInterceptor({ http }: OnRequestInterceptorDeps) {
  http.registerOnPreRouting(async function solutionOnPreRoutingHandler(
    request: KibanaRequest,
    response: LifecycleResponseFactory,
    toolkit: OnPreRoutingToolkit
  ) {
    const serverBasePath = http.basePath.serverBasePath;
    const path = request.url.pathname;

    // If navigating within the context of a solution, then we store the Solution's URL Context on the request,
    // and rewrite the request to not include the solution identifier in the URL.
    const { solutionId, pathHasExplicitSolutionIdentifier } = getSolutionIdFromPath(
      path,
      serverBasePath
    );

    if (pathHasExplicitSolutionIdentifier) {
      const reqBasePath = `/n/${solutionId}`;

      http.basePath.set(request, { id: 'solutions', basePath: reqBasePath });

      const indexPath = path.indexOf(reqBasePath);
      const otherBasePaths = indexPath > 0 ? path.slice(0, indexPath) : '';
      const newPathname = path.slice(indexPath + reqBasePath.length) || '/';

      return toolkit.rewriteUrl(`${otherBasePaths}${newPathname}${request.url.search}`);
    }

    return toolkit.next();
  });
}

function getSolutionIdFromPath(
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

function stripServerBasePath(requestBasePath: string, serverBasePath: string) {
  if (serverBasePath && serverBasePath !== '/' && requestBasePath.startsWith(serverBasePath)) {
    return requestBasePath.slice(serverBasePath.length);
  }
  return requestBasePath;
}
