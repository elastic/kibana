/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListState } from '../state/types';
import type { ContentListPhase } from './types';

/**
 * Inputs used to derive the render phase. A subset of {@link ContentListState}
 * so this function can be tested without constructing a full state object.
 */
export interface DerivePhaseInput {
  /** `true` only on the first fetch before any data has been received. */
  readonly isLoading: boolean;
  /** `true` during any fetch, including background refetches. */
  readonly isFetching: boolean;
  /** `true` when the content type has zero objects and no query is active. */
  readonly hasNoItems: boolean;
  /** `true` when a search or filter is active and returned zero hits. */
  readonly hasNoResults: boolean;
  /**
   * `true` when at least one search term, flag, or field filter is active.
   *
   * Computed once from the parsed `activeFilters` so phase derivation does
   * not have to re-interpret raw `queryText`.
   */
  readonly hasActiveQuery: boolean;
}

/**
 * Pure derivation of the render phase from Content List state.
 *
 * Exported separately from the hook for straightforward unit testing and
 * for reuse in tests that want to assert phase behavior without a React
 * tree.
 *
 * Precedence (earliest match wins):
 * 1. `isLoading` → `'initialLoad'`.
 * 2. `hasNoItems` → `'empty'`.
 * 3. `hasNoResults` → `'filtered'`.
 * 4. `isFetching && hasActiveQuery` → `'filtering'`.
 * 5. Otherwise → `'populated'`.
 *
 * `hasNoItems` and `hasNoResults` are derived from the latest **settled**
 * query data and held stable during background refetches (`keepPreviousData`),
 * so they do not reset on every in-flight fetch. The `'filtering'` branch is
 * therefore reachable when the user has applied a filter/search and the
 * updated results have not yet resolved — the previous data is still showing
 * and neither empty-state condition applies to it.
 */
export const derivePhase = (input: DerivePhaseInput): ContentListPhase => {
  if (input.isLoading) {
    return 'initialLoad';
  }
  if (input.hasNoItems) {
    return 'empty';
  }
  if (input.hasNoResults) {
    return 'filtered';
  }
  if (input.isFetching && input.hasActiveQuery) {
    return 'filtering';
  }
  return 'populated';
};

/**
 * Convenience adapter: derive a phase directly from a {@link ContentListState}.
 */
export const derivePhaseFromState = (state: ContentListState): ContentListPhase =>
  derivePhase({
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    hasNoItems: state.hasNoItems,
    hasNoResults: state.hasNoResults,
    hasActiveQuery: state.hasActiveQuery,
  });
