/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Determine which requested paths should be redirected from one basePath
 * to another. We only do this for a supset of the paths so that people don't
 * think that specifying a random three character string at the beginning of
 * a URL will work.
 */
export function shouldRedirectFromOldBasePath(path: string) {
  // strip `s/{id}` prefix when checking for need to redirect
  if (path.startsWith('s/')) {
    path = path.split('/').slice(2).join('/');
  }

  const isApp = path.startsWith('app/');
  const isKnownShortPath = ['login', 'logout', 'status'].includes(path);
  return isApp || isKnownShortPath;
}
