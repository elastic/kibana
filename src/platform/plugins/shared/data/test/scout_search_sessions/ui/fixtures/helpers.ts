/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

/** The subset of `scoutSpace.savedObjects.load()`'s result these specs read. */
interface LoadedSavedObject {
  id: string;
  type: string;
  title: string;
}

/**
 * Resolve a loaded dashboard's id by title. `scoutSpace.savedObjects.load()` imports with
 * `createNewCopies: true`, so ids differ per space and cannot be hardcoded.
 */
export const findLoadedDashboardId = (
  loadedObjects: LoadedSavedObject[],
  title: string
): string => {
  const dashboard = loadedObjects.find((so) => so.type === 'dashboard' && so.title === title);
  if (!dashboard) {
    const available = loadedObjects
      .filter((so) => so.type === 'dashboard')
      .map((so) => so.title)
      .join(', ');
    throw new Error(`Dashboard "${title}" not found in loaded objects. Available: ${available}`);
  }
  return dashboard.id;
};

/**
 * The logged-in browser user's session cookie, shaped as a request header.
 *
 * Every background search is owned by the user that created it, so API calls that need to see
 * what the browser did must carry that user's session: the same call made as the `kbnClient`
 * superuser would succeed and report nothing.
 */
export const getSessionCookieHeader = async (page: ScoutPage): Promise<Record<string, string>> => {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(({ name }) => name === 'sid');
  if (!sessionCookie) {
    throw new Error('No "sid" cookie on the browser context — is a user logged in?');
  }
  return { Cookie: `sid=${sessionCookie.value}` };
};
