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
import type { UserProfileStore } from '@kbn/content-list-provider';
import {
  useContentListState,
  useQueryModel,
  useUserProfileStoreContext,
} from '@kbn/content-list-provider';
import type { PrimingState } from './prime_relevant_profiles';
import { primeRelevantProfiles } from './prime_relevant_profiles';

/**
 * Field names backed by user profiles.
 *
 * Extend when adding future user-profile fields (e.g. `updatedBy`).
 * Checked against {@link ContentListQueryModel.referencedFields} to determine
 * whether a user-profile field clause is present in the query.
 */
const USER_FIELD_NAMES = ['createdBy'];

/**
 * Props for {@link ProfilePrimeEffect}.
 */
interface ProfilePrimeEffectProps {
  getItems: () => UserContentCommonSchema[];
  getDatasetVersion: () => number;
  primingState: PrimingState;
  /** Ref bridge — written by this component so parent-level closures
   *  (e.g. `getFacets`) can read the store without a context dependency. */
  storeRef: React.MutableRefObject<UserProfileStore | undefined>;
}

/**
 * Private child component rendered inside `ContentListProvider`'s children
 * tree by `ContentListClientProvider`.
 *
 * Two responsibilities:
 * 1. Populate the `storeRef` so parent-level closures (like `getFacets`) can
 *    read the store that lives in this context subtree.
 * 2. Prime the shared profile store with UIDs from the full cached item
 *    universe when the parsed query model references a user-profile field
 *    (e.g. `createdBy:alice`). This ensures fuzzy resolution via
 *    `resolveFuzzyDisplayToIds` over `store.getAll()` has the profiles it
 *    needs without an additional network call.
 *
 * Uses {@link ContentListQueryModel.referencedFields} as the trigger rather
 * than raw string matching. `referencedFields` records which fields had a
 * clause with a non-empty value in the parsed AST, regardless of whether
 * the value resolved to an ID. This breaks the bootstrap cycle: the effect
 * fires when the user types `createdBy:alice`, populates the store, and on
 * the next derivation `resolveDisplayToId` succeeds.
 *
 * Renders nothing — exists only for side-effects.
 */
export const ProfilePrimeEffect = ({
  getItems,
  getDatasetVersion,
  primingState,
  storeRef,
}: ProfilePrimeEffectProps): null => {
  const { state } = useContentListState();
  const store = useUserProfileStoreContext();
  const model = useQueryModel(state.queryText);

  // Keep the ref bridge in sync so `getFacets` can always read the current store.
  storeRef.current = store;

  const needsPriming = USER_FIELD_NAMES.some((n) => model.unresolvedFields.has(n));

  // Prime when the query references a user-profile field with unresolved values.
  // `state.items` is included as a reactive trigger — it changes after
  // each fetch, signalling that `getDatasetVersion()` may have bumped.
  // Without it, the effect fires before the fetch completes and the stale
  // version causes the version guard to skip.
  // The `needsPriming` gate ensures this doesn't fire for normal
  // free-text searches or when all field values are already resolved
  // (e.g. clicking an avatar writes a UID that `resolveDisplayToId` already
  // handles via the per-page seeding cache).
  const { items } = state;
  useEffect(() => {
    if (!store || !needsPriming) {
      return;
    }

    const allItems = getItems();

    if (allItems.length === 0) {
      return;
    }

    primeRelevantProfiles(allItems, getDatasetVersion(), store, primingState);
  }, [needsPriming, items, store, getItems, getDatasetVersion, primingState]);

  return null;
};
