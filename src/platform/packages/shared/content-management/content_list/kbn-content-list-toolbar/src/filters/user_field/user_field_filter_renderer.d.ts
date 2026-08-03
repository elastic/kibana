import React from 'react';
import { type Query } from '@elastic/eui';
/**
 * Props for the {@link UserFieldFilterRenderer} component.
 */
export interface UserFieldFilterRendererProps {
    /** The filter field name (e.g. `'createdBy'`, `'updatedBy'`). */
    fieldName: string;
    /** Title displayed in the popover header and button. */
    title: string;
    /** Query object from `EuiSearchBar`. */
    query?: Query;
    /** `onChange` callback from `EuiSearchBar`. */
    onChange?: (query: Query) => void;
    /** Message shown when no users are available. */
    emptyMessage: string;
    /** Message shown when search yields no matches. */
    noMatchesMessage: string;
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
/**
 * Generic filter popover renderer for user-UID-based fields.
 *
 * Consumes `useFilterFacets(fieldName)` for display-ready user facets with
 * counts, matching the same pattern used by `TagFilterRenderer`.
 *
 * Reusable across `createdBy`, `updatedBy`, and other user-UID fields.
 */
export declare const UserFieldFilterRenderer: ({ fieldName, title, query, onChange, emptyMessage, noMatchesMessage, "data-test-subj": dataTestSubj, }: UserFieldFilterRendererProps) => React.JSX.Element | null;
