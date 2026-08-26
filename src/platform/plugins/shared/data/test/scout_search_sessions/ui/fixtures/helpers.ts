/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KibanaUrl, ScoutPage } from '@kbn/scout';
import { SESSION_API_PATH } from './constants';

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

// Version header required by the background search internal API.
const SESSION_VERSION = '1';
const SESSION_HEADERS = {
  [ELASTIC_HTTP_VERSION_HEADER]: SESSION_VERSION,
  'kbn-xsrf': 'anything',
  'kbn-system-request': 'true',
};

export interface DeleteAllBackgroundSearchesOptions {
  page: ScoutPage;
  kbnUrl: KibanaUrl;
  spaceId: string;
}

/**
 * Delete every background search owned by the logged-in browser user in the given Kibana space.
 *
 * The requests go through `page.request` so they carry the browser's session cookie: every
 * `/internal/session` operation is scoped to the user that created a session, so running this as
 * the `kbnClient` superuser instead would find — and therefore delete — nothing.
 *
 * Specs that store background searches must call this in `afterEach`, where the page is still
 * available. Leftover sessions show up in the next test's management table and in other suites
 * that assert on the `_find` API.
 */
export const deleteAllBackgroundSearches = async ({
  page,
  kbnUrl,
  spaceId,
}: DeleteAllBackgroundSearchesOptions) => {
  const sessionApi = (path: string = '') =>
    kbnUrl.get(
      spaceId === 'default'
        ? `${SESSION_API_PATH}${path}`
        : `s/${spaceId}${SESSION_API_PATH}${path}`
    );

  const response = await page.request.post(sessionApi('/_find'), {
    headers: SESSION_HEADERS,
    data: { page: 1, perPage: 10_000, sortField: 'created', sortOrder: 'asc' },
  });

  // A user without the `store_search_session` privilege cannot reach the API at all, and by the
  // same token has no background searches to clean up.
  if (response.status() === 403) return;

  if (!response.ok()) {
    throw new Error(`Failed to list background searches: ${response.status()}`);
  }

  const { saved_objects: savedObjects }: { saved_objects: Array<{ id: string }> } =
    await response.json();

  await Promise.all(
    savedObjects.map(({ id }) =>
      page.request.delete(sessionApi(`/${id}`), { headers: SESSION_HEADERS })
    )
  );
};
