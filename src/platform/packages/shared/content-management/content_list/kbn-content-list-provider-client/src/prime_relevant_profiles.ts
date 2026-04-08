/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { UserProfileStore } from '@kbn/content-list-provider';
import { getCreatorKey, MANAGED_USER_FILTER, NO_CREATOR_USER_FILTER } from './strategy';

const SENTINEL_KEYS = new Set([MANAGED_USER_FILTER, NO_CREATOR_USER_FILTER]);

/**
 * Collect unique real user UIDs from the cached item set.
 *
 * Uses the same {@link getCreatorKey} logic as filtering and facets so that
 * priming, filters, and popovers always agree on what constitutes a "real" UID.
 * Sentinel values (`__managed__`, `__no_creator__`) are excluded — they must
 * never be passed to `bulkResolve`.
 */
export const collectRealUids = (items: UserContentCommonSchema[]): string[] => {
  const uids = new Set<string>();
  for (const item of items) {
    const key = getCreatorKey(item);
    if (!SENTINEL_KEYS.has(key)) {
      uids.add(key);
    }
  }
  return Array.from(uids);
};

/**
 * State tracked across priming cycles to avoid redundant `ensureLoaded` calls.
 *
 * A single instance is shared by the ProfilePrimer component and `getFacets`.
 */
export interface PrimingState {
  /** The dataset version that was last primed. */
  lastVersion: number;
  /** Guard against concurrent in-flight priming calls. */
  inflight: Promise<void> | undefined;
}

export const createPrimingState = (): PrimingState => ({
  lastVersion: -1,
  inflight: undefined,
});

/**
 * Prime the shared {@link UserProfileStore} with profiles for user UIDs
 * present in the current cached item set.
 *
 * Properties:
 * - **Lazy:** Delegates to `store.ensureLoaded`, which only fetches UIDs
 *   not already cached or in-flight.
 * - **Incremental:** Subsequent calls with a stable `datasetVersion` are no-ops.
 * - **Deduped:** Concurrent calls share a single in-flight promise. The
 *   store's own in-flight tracking prevents duplicate `bulkResolve` requests
 *   even when other callers (e.g. `useContentListItemsQuery`) call
 *   `ensureLoaded` for overlapping UIDs in the same render cycle.
 * - **Sentinel-safe:** Sentinel keys are never passed to `ensureLoaded`.
 *
 * @param items - The full (unfiltered) cached item set from the client strategy.
 * @param datasetVersion - Monotonic counter that increments when the item universe changes.
 * @param store - The shared profile store to load profiles into.
 * @param state - Mutable priming state shared across trigger sites.
 */
export const primeRelevantProfiles = (
  items: UserContentCommonSchema[],
  datasetVersion: number,
  store: UserProfileStore,
  state: PrimingState
): Promise<void> => {
  // Already primed for this version — nothing to do.
  if (state.lastVersion === datasetVersion) {
    return state.inflight ?? Promise.resolve();
  }

  // If there's an in-flight call for a stale version, let it finish but don't
  // wait on it — start fresh for the new version.
  state.lastVersion = datasetVersion;

  const realUids = collectRealUids(items);

  if (realUids.length === 0) {
    state.inflight = undefined;
    return Promise.resolve();
  }

  // Delegate to the store's `ensureLoaded`, which checks the cache and
  // in-flight set internally. This means the per-page `ensureLoaded` call
  // in `useContentListItemsQuery` becomes a no-op for UIDs that priming
  // is already fetching.
  const work = store.ensureLoaded(realUids).then(
    () => {
      if (state.inflight === work) {
        state.inflight = undefined;
      }
    },
    () => {
      // On rejection, reset version so the next call retries instead of
      // returning the stale rejected promise.
      if (state.inflight === work) {
        state.inflight = undefined;
        state.lastVersion = -1;
      }
    }
  );

  state.inflight = work;
  return work;
};
