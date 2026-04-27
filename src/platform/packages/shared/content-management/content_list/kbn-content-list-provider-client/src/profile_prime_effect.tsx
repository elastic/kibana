/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import {
  useContentListState,
  useQueryModel,
  useProfileCache,
  SENTINEL_KEYS,
  getCreatorKey,
} from '@kbn/content-list-provider';

/**
 * Field names backed by user profiles.
 *
 * Extend when adding future user-profile fields (e.g. `updatedBy`).
 */
const USER_FIELD_NAMES = ['createdBy'];

/** Collect unique real user UIDs from the item set, excluding sentinels. */
const collectRealUids = (items: UserContentCommonSchema[]): string[] => {
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
 * Props for {@link ProfilePrimeEffect}.
 */
interface ProfilePrimeEffectProps {
  getItems: () => UserContentCommonSchema[];
}

/**
 * Side-effect component that primes the shared {@link ProfileCache} with
 * UIDs from the full cached item universe when the parsed query model
 * references a user-profile field with unresolved values (e.g. `createdBy:alice`).
 *
 * This ensures fuzzy resolution via `resolveFuzzyDisplayToIds` over
 * `cache.getAll()` has the profiles it needs. The cache's internal
 * `requested` set makes `ensureLoaded` idempotent — no external version
 * tracking or dedup logic needed.
 *
 * Renders nothing — exists only for side-effects.
 */
export const ProfilePrimeEffect = ({ getItems }: ProfilePrimeEffectProps): null => {
  const { state } = useContentListState();
  const cache = useProfileCache();
  const model = useQueryModel(state.queryText);

  const needsPriming = USER_FIELD_NAMES.some((n) => model.unresolvedFields.has(n));

  // `state.items` is included as a reactive trigger — it changes after
  // each fetch, signalling that new items may have new UIDs to prime.
  const { items } = state;
  useEffect(() => {
    if (!cache || !needsPriming) {
      return;
    }
    const allItems = getItems();
    if (allItems.length === 0) {
      return;
    }
    const realUids = collectRealUids(allItems);
    if (realUids.length > 0) {
      cache.ensureLoaded(realUids).catch(() => {});
    }
  }, [needsPriming, items, cache, getItems]);

  return null;
};
