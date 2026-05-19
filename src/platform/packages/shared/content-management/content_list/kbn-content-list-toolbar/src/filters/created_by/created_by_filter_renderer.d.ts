import React from 'react';
import type { Query } from '@elastic/eui';
/**
 * Props for the {@link CreatedByFilterRenderer} component.
 *
 * When used with `EuiSearchBar` `custom_component` filters, the search bar passes
 * `query` and `onChange` props.
 */
export interface CreatedByFilterRendererProps {
    /** Query object from `EuiSearchBar`. */
    query?: Query;
    /** `onChange` callback from `EuiSearchBar`. */
    onChange?: (query: Query) => void;
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
/**
 * `CreatedByFilterRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * Thin wrapper around {@link UserFieldFilterRenderer} for the `createdBy` field.
 */
export declare const CreatedByFilterRenderer: ({ query, onChange, "data-test-subj": dataTestSubj, }: CreatedByFilterRendererProps) => React.JSX.Element | null;
