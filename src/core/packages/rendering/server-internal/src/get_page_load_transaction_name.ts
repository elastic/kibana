/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const APP_ID_FROM_PATH_REGEX = /\/app\/([^/?#]+)/;

/**
 * Derives a low-cardinality page-load transaction name from a URL pathname.
 *
 * - App routes resolve to `/app/{appId}`, regardless of deeper path segments or
 *   any server/space base-path prefix (the match is not anchored, so a leading
 *   `/s/{space}` or `server.basePath` prefix is ignored). This mirrors the
 *   client-side name set in `ApmSystem.closePageLoadTransaction` (`/app/{appId}`),
 *   keeping the server seed and the client rename consistent.
 * - Non-app routes (e.g. `/login`) keep their pathname as-is; the prefix is a
 *   fixed per-deployment constant, so their cardinality is already bounded.
 */
export const getPageLoadTransactionName = (pathname: string): string => {
  const appMatch = pathname.match(APP_ID_FROM_PATH_REGEX);

  if (appMatch) {
    return `/app/${appMatch[1]}`;
  }

  return pathname;
};
