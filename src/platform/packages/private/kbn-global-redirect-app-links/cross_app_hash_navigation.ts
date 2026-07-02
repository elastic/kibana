/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Resolves hash-only navigation that targets Dashboards routes while the browser
 * pathname still points at Discover (a common hash-router collision in agent-first chrome).
 */
export const resolveCrossAppHashNavigationUrl = (url: URL): string | undefined => {
  if (!isDiscoverBrowserPath(url.pathname) || !isDashboardHashFragment(url.hash)) {
    return undefined;
  }

  return `${url.origin}${replaceDiscoverPathWithDashboards(url.pathname)}${url.search}${url.hash}`;
};

const isDashboardHashFragment = (hash: string): boolean => {
  if (!hash.startsWith('#/')) {
    return false;
  }

  const path = hash.slice(1).split('?')[0] ?? '';
  return path === '/list' || path.startsWith('/list/') || path.startsWith('/view/') || path.startsWith('/create');
};

const isDiscoverBrowserPath = (pathname: string): boolean => /\/app\/discover(?:\/|$)/.test(pathname);

const replaceDiscoverPathWithDashboards = (pathname: string): string =>
  pathname.replace(/\/app\/discover(?=\/|$)/, '/app/dashboards');
