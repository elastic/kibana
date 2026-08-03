import type { UseContentListSelectionReturn } from './types';
/**
 * Hook to access and control item selection.
 *
 * Provides the current selection state and functions to modify it.
 * When selection is disabled (via `features.selection: false` or `isReadOnly`),
 * `setSelection` and `clearSelection` become no-ops and `isSupported` returns `false`.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing selection state, mutation functions, and support flag.
 *
 * @example
 * ```tsx
 * const { selectedItems, selectedCount, clearSelection, isSupported } = useContentListSelection();
 *
 * if (!isSupported) return null;
 *
 * return (
 *   <div>
 *     {selectedCount} items selected
 *     <button onClick={clearSelection}>Clear</button>
 *   </div>
 * );
 * ```
 */
export declare const useContentListSelection: () => UseContentListSelectionReturn;
