import React from 'react';
/**
 * Props for the pure {@link PaginationComponent}.
 */
export interface PaginationComponentProps {
    /** Current page index (0-based). */
    pageIndex: number;
    /** Current number of items per page. */
    pageSize: number;
    /** Total number of items matching the current query. */
    totalItems: number;
    /** Available page size options for the dropdown. */
    pageSizeOptions: number[];
    /** Called when the user navigates to a different page. */
    onPageChange: (index: number) => void;
    /** Called when the user changes the items-per-page setting. */
    onPageSizeChange: (size: number) => void;
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
/**
 * Pure presentational pagination component wrapping `EuiTablePagination`.
 *
 * All data is provided via props -- no provider hooks.
 * This component is suitable for unit testing without a provider.
 */
export declare const PaginationComponent: ({ pageIndex, pageSize, totalItems, pageSizeOptions, onPageChange, onPageSizeChange, "data-test-subj": dataTestSubj, }: PaginationComponentProps) => React.JSX.Element | null;
