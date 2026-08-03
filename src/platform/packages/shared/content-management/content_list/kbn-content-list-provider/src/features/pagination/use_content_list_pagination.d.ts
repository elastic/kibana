/**
 * Return type for the {@link useContentListPagination} hook.
 */
export interface UseContentListPaginationReturn {
    /** Whether pagination is supported (enabled via features). */
    isSupported: boolean;
    /** Current page index (0-based). */
    pageIndex: number;
    /** Current number of items per page. */
    pageSize: number;
    /** Total number of items matching the current query. */
    totalItems: number;
    /** Total number of pages. */
    pageCount: number;
    /** Available page size options for the dropdown. */
    pageSizeOptions: number[];
    /** Navigate to a specific page index. No-op if pagination is disabled. */
    setPageIndex: (index: number) => void;
    /** Change the page size (resets to page 0). No-op if pagination is disabled. Persists to `localStorage`. */
    setPageSize: (size: number) => void;
}
/**
 * Hook to access and control pagination functionality.
 *
 * Use this hook when you need to read or update the current page.
 * When pagination is disabled via `features.pagination: false`, `setPageIndex`
 * and `setPageSize` become no-ops and `isSupported` returns `false`.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing pagination state and control functions.
 *
 * @example
 * ```tsx
 * const { pageIndex, pageSize, totalItems, pageCount, setPageIndex, setPageSize } =
 *   useContentListPagination();
 *
 * return (
 *   <EuiTablePagination
 *     activePage={pageIndex}
 *     itemsPerPage={pageSize}
 *     pageCount={pageCount}
 *     onChangePage={setPageIndex}
 *     onChangeItemsPerPage={setPageSize}
 *   />
 * );
 * ```
 */
export declare const useContentListPagination: () => UseContentListPaginationReturn;
