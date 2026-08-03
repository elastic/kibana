/**
 * Return type for the `useContentListSort` hook.
 */
export interface UseContentListSortReturn {
    /** Current sort field name. */
    field: string;
    /** Current sort direction. */
    direction: 'asc' | 'desc';
    /** Updates the sort configuration. No-op if sorting is disabled. */
    setSort: (field: string, direction: 'asc' | 'desc') => void;
    /** Whether sorting is supported (enabled via features). */
    isSupported: boolean;
}
/**
 * Hook to access and control sorting functionality.
 *
 * Use this hook when you need to read or update the sort configuration.
 * When sorting is disabled via `features.sorting: false`, `setSort` becomes a no-op
 * and `isSupported` returns `false`.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing field, direction, setSort function, and isSupported flag.
 *
 * @example
 * ```tsx
 * function SortControls() {
 *   const { field, direction, setSort, isSupported } = useContentListSort();
 *
 *   if (!isSupported) return null;
 *
 *   return (
 *     <EuiSelect
 *       value={`${field}-${direction}`}
 *       onChange={(e) => {
 *         const [newField, newDirection] = e.target.value.split('-');
 *         setSort(newField, newDirection as 'asc' | 'desc');
 *       }}
 *       options={[
 *         { value: 'title-asc', text: 'Title A-Z' },
 *         { value: 'title-desc', text: 'Title Z-A' },
 *         { value: 'updatedAt-desc', text: 'Recently updated' },
 *       ]}
 *     />
 *   );
 * }
 * ```
 */
export declare const useContentListSort: () => UseContentListSortReturn;
