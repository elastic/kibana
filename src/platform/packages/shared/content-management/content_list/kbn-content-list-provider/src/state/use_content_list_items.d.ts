/**
 * Hook to access the current list of items and loading state.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing items, totalItems, isLoading, isFetching, error,
 *   hasNoItems, hasNoResults, hasActiveQuery, and refetch.
 *
 * @example
 * ```tsx
 * function MyList() {
 *   const { items, isLoading, isFetching, error, hasNoItems, hasNoResults, refetch } = useContentListItems();
 *
 *   if (isLoading) return <EuiLoadingSpinner />;
 *   if (error) return <ErrorCallout color="danger" title={error.message} />;
 *
 *   return (
 *     <ul>
 *       {items.map((item) => (
 *         <li key={item.id}>{item.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export declare const useContentListItems: () => {
    items: import("@kbn/content-list").ContentListItem[];
    totalItems: number;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | undefined;
    hasNoItems: boolean;
    hasNoResults: boolean;
    hasActiveQuery: boolean;
    refetch: () => Promise<void>;
};
