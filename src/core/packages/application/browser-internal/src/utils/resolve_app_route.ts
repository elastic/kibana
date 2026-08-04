/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { matchPath } from 'react-router-dom';
import { AppStatus } from '@kbn/core-application-browser';
import type { Mounter } from '../types';

/** @internal */
export interface ResolvedAppRoute {
  appId: string;
  /** Scoped-history base: `match.path` for registered mounters, `match.url` for `/app/:appId`. */
  appPath: string;
  mounter?: Mounter;
}

/**
 * Single source of truth for application route matching: custom `appRoute` entries
 * in registration order, then the `/app/:appId` catch-all. Returns undefined when
 * the pathname is outside application routing.
 */
export const resolveAppRoute = (
  pathname: string,
  mounters: Map<string, Mounter>
): ResolvedAppRoute | undefined => {
  for (const [appId, mounter] of mounters) {
    const match = matchPath(pathname, {
      path: mounter.appRoute,
      exact: mounter.exactRoute,
    });
    if (match) {
      // Prefer match.path over match.url to preserve historical AppRouter behavior for
      // parameterized custom appRoute patterns.
      return { appId, mounter, appPath: match.path };
    }
  }

  const legacyMatch = matchPath<{ appId: string }>(pathname, { path: '/app/:appId' });
  if (!legacyMatch) {
    return undefined;
  }

  const { appId } = legacyMatch.params;
  return {
    appId,
    appPath: legacyMatch.url,
    mounter: mounters.get(appId),
  };
};

/**
 * True when AppRouter would render App Not Found for the given location.
 * False for an accessible app or a route outside application routing.
 */
export const isAppNotFound = (
  pathname: string,
  mounters: Map<string, Mounter>,
  statuses: Map<string, AppStatus>
): boolean => {
  const resolved = resolveAppRoute(pathname, mounters);
  if (!resolved) {
    return false;
  }

  const status = statuses.get(resolved.appId) ?? AppStatus.inaccessible;
  return !resolved.mounter || status !== AppStatus.accessible;
};

export const pathnameFromLocationUrl = (locationUrl: string): string => {
  const hashIndex = locationUrl.indexOf('#');
  return hashIndex === -1 ? locationUrl : locationUrl.slice(0, hashIndex);
};
