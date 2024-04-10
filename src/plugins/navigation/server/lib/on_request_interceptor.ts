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

import { addSolutionIdToPath, getSolutionIdFromPath, stripSolutionIdFromPath } from '../../common';
import type { NavigationConfig } from '../config';
export interface OnRequestInterceptorDeps {
  http: CoreSetup['http'];
  defaultSolution: NavigationConfig['solutionNavigation']['defaultSolution'];
}

export function initSolutionOnRequestInterceptor({
  http,
  defaultSolution,
}: OnRequestInterceptorDeps) {
  http.registerOnPreRouting(async function solutionOnPreRoutingHandler(
    request: KibanaRequest,
    response: LifecycleResponseFactory,
    toolkit: OnPreRoutingToolkit
  ) {
    const serverBasePath = http.basePath.serverBasePath;
    let path = request.url.pathname;

    // If navigating within the context of a solution, then we store the Solution's URL Context on the request,
    // and rewrite the request to not include the solution identifier in the URL.
    let { solutionId, pathHasExplicitSolutionIdentifier } = getSolutionIdFromPath(
      path,
      serverBasePath
    );

    let redirectUrl: string | null = null;

    // To avoid a double full page reload (1) after logging in and (2) to set the default solution
    // in the base path, we proactively redirect to the default solution
    if (!pathHasExplicitSolutionIdentifier && path.includes('spaces/space_selector')) {
      solutionId = defaultSolution;
      path = addSolutionIdToPath('/', solutionId, path);
      pathHasExplicitSolutionIdentifier = true;
      redirectUrl = `${serverBasePath}${path}`;
    }

    if (pathHasExplicitSolutionIdentifier) {
      const reqBasePath = `/n/${solutionId}`;

      const indexBasePath = path.indexOf(reqBasePath);
      const newPathname = stripSolutionIdFromPath(path) || '/';

      http.basePath.set(request, { id: 'solutions', basePath: reqBasePath, index: indexBasePath });

      if (redirectUrl) {
        return response.redirected({
          headers: { location: redirectUrl },
        });
      }

      return toolkit.rewriteUrl(`${newPathname}${request.url.search}`);
    }

    return toolkit.next();
  });
}
