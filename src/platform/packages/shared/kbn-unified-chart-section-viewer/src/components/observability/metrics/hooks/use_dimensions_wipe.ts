/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { Dimension } from '../../../../types';

export interface UseDimensionsWipeParams {
  /** What the user wants (intent), as persisted in `useMetricsExperienceState`. */
  selectedDimensions: Dimension[];
  /** What the active stream actually emits (from `METRICS_INFO`). */
  allDimensions: Dimension[];
  /** Skip while a fetch is in flight; `allDimensions` may still be from the previous stream. */
  isLoading: boolean;
  /** Skip when the last fetch errored; pruning would discard intent based on invalid data. */
  hasError: boolean;
  /**
   * Discover's current breakdown field. Used to decide whether the wipe
   * needs to update it: if the current breakdown survives the prune we
   * leave it untouched.
   */
  breakdownField: string | undefined;
  /** Called with the pruned subset of `selectedDimensions`. */
  onSelectedDimensionsChange: (pruned: Dimension[]) => void;
  /**
   * Called only when the current `breakdownField` does NOT survive the
   * prune. Receives the new default (`pruned[0]?.name`, possibly
   * `undefined`).
   */
  onBreakdownFieldChange?: (next: string | undefined) => void;
}

/**
 * Wipe orphan selections when the active stream changes.
 *
 * The grid keeps `selectedDimensions` (intent) in URL state, persisted
 * across stream switches. After a successful `METRICS_INFO` fetch we know
 * the per-stream universe (`allDimensions`); any selection outside that
 * universe is pruned. If the current `breakdownField` no longer maps to a
 * surviving selection, we also propose a new default to Discover.
 *
 * We only act on a fresh, successful response (gates on `isLoading` and
 * `hasError`) to avoid discarding intent based on stale or invalid data.
 */
export function useDimensionsWipe({
  selectedDimensions,
  allDimensions,
  isLoading,
  hasError,
  breakdownField,
  onSelectedDimensionsChange,
  onBreakdownFieldChange,
}: UseDimensionsWipeParams): void {
  useEffect(() => {
    if (isLoading || hasError || selectedDimensions.length === 0) {
      return;
    }
    const pruned = selectedDimensions.filter((dimension) =>
      allDimensions.some((available) => available.name === dimension.name)
    );
    if (pruned.length === selectedDimensions.length) {
      return;
    }
    onSelectedDimensionsChange(pruned);

    const breakdownSurvived =
      breakdownField != null && pruned.some((dimension) => dimension.name === breakdownField);
    if (!breakdownSurvived) {
      onBreakdownFieldChange?.(pruned[0]?.name);
    }
  }, [
    allDimensions,
    selectedDimensions,
    isLoading,
    hasError,
    breakdownField,
    onSelectedDimensionsChange,
    onBreakdownFieldChange,
  ]);
}
