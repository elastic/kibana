/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContentListState } from '../state/use_content_list_state';
import { derivePhaseFromState } from './derive_phase';
import type { ContentListPhase } from './types';

/**
 * Hook to access the current render phase of the Content List.
 *
 * Use this to decide what a section renders without chaining multiple
 * `isLoading` / `isFetching` / `hasNoItems` / `hasNoResults` checks.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns The current phase; one of
 *   `'initialLoad' | 'empty' | 'filtering' | 'filtered' | 'populated'`.
 *
 * @example
 * ```tsx
 * const phase = useContentListPhase();
 * if (phase === 'initialLoad') return <ToolbarSkeleton />;
 * if (phase === 'empty') return null;
 * return <Toolbar ... />;
 * ```
 */
export const useContentListPhase = (): ContentListPhase => {
  const { state } = useContentListState();
  return derivePhaseFromState(state);
};

/**
 * `true` when no fetch has completed yet. Sections typically render a
 * skeleton in this phase.
 */
export const useIsInitialLoad = (): boolean => useContentListPhase() === 'initialLoad';

/**
 * `true` when the content type has zero objects and no filter is active.
 * Most sections return `null` in this phase so the empty state can take
 * over the region.
 */
export const useIsEmpty = (): boolean => useContentListPhase() === 'empty';

/**
 * `true` when a filter or search is active and a fetch is currently in
 * flight. Toolbar typically shows a subtle loading indicator; the table
 * keeps stale rows and passes `loading` to its `EuiBasicTable`.
 */
export const useIsFiltering = (): boolean => useContentListPhase() === 'filtering';

/**
 * `true` when a filter or search is active and returned zero matches. The
 * table renders its built-in "no items message"; footer hides; toolbar
 * stays visible.
 */
export const useIsFiltered = (): boolean => useContentListPhase() === 'filtered';

/**
 * `true` when items are loaded and the list is in its normal state.
 */
export const useIsPopulated = (): boolean => useContentListPhase() === 'populated';
