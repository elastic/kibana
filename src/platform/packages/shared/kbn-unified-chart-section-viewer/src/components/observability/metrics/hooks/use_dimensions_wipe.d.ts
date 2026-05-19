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
export declare function useDimensionsWipe({ selectedDimensions, allDimensions, isLoading, hasError, breakdownField, onSelectedDimensionsChange, onBreakdownFieldChange, }: UseDimensionsWipeParams): void;
