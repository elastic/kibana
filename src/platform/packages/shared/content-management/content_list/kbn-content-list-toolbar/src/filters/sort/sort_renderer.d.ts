import React from 'react';
import { type Query } from '@elastic/eui';
/**
 * Props for the {@link SortRenderer} component.
 *
 * When used with `EuiSearchBar` `custom_component` filters, the search bar passes
 * `query` and `onChange` props. The sort filter doesn't use these (it manages sort
 * state separately via `useContentListSort`), but we accept them for compatibility.
 */
export interface SortRendererProps {
    /** Query object from `EuiSearchBar` (unused - sort doesn't affect query). */
    query: Query;
    /** `onChange` callback from `EuiSearchBar` (unused - sort doesn't affect query). */
    onChange?: (query: Query) => void;
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
/**
 * `SortRenderer` component for the toolbar sort dropdown.
 *
 * This is the actual UI component for the sort dropdown.
 * It renders a popover with a selectable list of sort options.
 *
 * @param props - The component props. See {@link SortRendererProps}.
 * @returns A React element containing the sort dropdown.
 */
export declare const SortRenderer: ({ "data-test-subj": dataTestSubj, }: SortRendererProps) => React.JSX.Element;
