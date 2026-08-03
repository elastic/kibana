import React from 'react';
import { type Query } from '@elastic/eui';
/**
 * Props for the {@link TagFilterRenderer} component.
 *
 * When used with `EuiSearchBar` `custom_component` filters, the search bar passes
 * `query` and `onChange` props. The tag filter uses these to sync include/exclude
 * state directly with the search bar query text.
 */
export interface TagFilterRendererProps {
    /** Query object from `EuiSearchBar`. */
    query?: Query;
    /** `onChange` callback from `EuiSearchBar`. */
    onChange?: (query: Query) => void;
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
/**
 * `TagFilterRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * Consumes `useFilterFacets('tag')` for display-ready tag facets with counts.
 * Falls back to an empty option list when `getFacets` is not provided.
 *
 * Features:
 * - Multi-select with include/exclude support (Cmd+click to exclude).
 * - Tag counts per option (from `getFacets`).
 * - Search within the popover.
 * - Colored tag badges.
 *
 * Requires `ContentManagementTagsProvider` in the component tree (automatically
 * provided when `services.tags` is configured on the `ContentListProvider`).
 */
export declare const TagFilterRenderer: ({ query, onChange, "data-test-subj": dataTestSubj, }: TagFilterRendererProps) => React.JSX.Element | null;
