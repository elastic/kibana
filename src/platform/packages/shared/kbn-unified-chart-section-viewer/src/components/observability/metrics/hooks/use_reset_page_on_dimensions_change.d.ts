import type { Dimension } from '../../../../types';
/**
 * Resets pagination to page 0 whenever the set of selected dimensions
 * changes in any way: adding the first breakdown, clearing the last one,
 * swapping the primary, or adding/removing a secondary. The fetch query
 * filters metrics by ALL selected dimensions, so any change can shift
 * the result set and invalidate the current page.
 *
 * The initial render is implicitly skipped because `usePrevious` returns
 * `undefined` until the effect first runs, which preserves a restored
 * `currentPage` on tab duplication where `useRestorableState` hydrates
 * `selectedDimensions` synchronously in that same first render.
 */
export declare function useResetPageOnDimensionsChange(selectedDimensions: Dimension[], onPageChange: (page: number) => void): void;
