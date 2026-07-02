/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Hash path prefixes owned by the Dashboards app (hash router), not Discover.
 * When these appear on Discover's hash history they indicate a cross-app collision.
 */
const DASHBOARD_HASH_PATH_PREFIXES = ['/list', '/view', '/create'] as const;

export const isDashboardHashPathname = (pathname: string): boolean =>
  DASHBOARD_HASH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

export const isDashboardHashFragment = (hash: string): boolean => {
  if (!hash.startsWith('#/')) {
    return false;
  }

  return isDashboardHashPathname(hash.slice(1).split('?')[0] ?? '');
};

export const isDiscoverBrowserPath = (pathname: string): boolean =>
  /\/app\/discover(?:\/|$)/.test(pathname);

export const getDashboardNavigateHashPath = (
  discoverHashPathname: string,
  search = ''
): string => `#${discoverHashPathname}${search}`;

export const replaceDiscoverPathWithDashboards = (pathname: string): string =>
  pathname.replace(/\/app\/discover(?=\/|$)/, '/app/dashboards');
