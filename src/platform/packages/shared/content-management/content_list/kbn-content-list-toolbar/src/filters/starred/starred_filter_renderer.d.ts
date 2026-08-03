import React from 'react';
import type { Query } from '@elastic/eui';
/**
 * Props for the {@link StarredFilterRenderer} component.
 *
 * When used with `EuiSearchBar` `custom_component` filters, the search bar passes
 * `query` and `onChange` props. The starred filter uses these to add or remove
 * `is:starred` in the query text.
 */
export interface StarredFilterRendererProps {
    /** Query object from `EuiSearchBar`. */
    query?: Query;
    /** `onChange` callback from `EuiSearchBar`. */
    onChange?: (query: Query) => void;
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
/**
 * `StarredFilterRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * Renders a single toggle button that adds/removes `is:starred` from the query.
 * Unlike the tag filter (multi-select popover), starred is a simple boolean toggle.
 */
export declare const StarredFilterRenderer: ({ query, onChange, "data-test-subj": dataTestSubj, }: StarredFilterRendererProps) => React.JSX.Element | null;
