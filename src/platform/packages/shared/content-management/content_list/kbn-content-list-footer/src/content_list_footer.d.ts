import React from 'react';
/**
 * Props for the {@link ContentListFooter} component.
 */
export interface ContentListFooterProps {
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
/**
 * Footer component for content lists.
 *
 * Renders pagination controls that match the layout of `EuiBasicTable`'s
 * `PaginationBar` ("Rows per page" on the left, page buttons on the right).
 *
 * When pagination is not enabled in the provider, renders nothing.
 *
 * @example
 * ```tsx
 * <ContentListProvider id="my-list" ...>
 *   <ContentListTable />
 *   <ContentListFooter />
 * </ContentListProvider>
 * ```
 */
export declare const ContentListFooter: ({ "data-test-subj": dataTestSubj, }: ContentListFooterProps) => React.JSX.Element | null;
