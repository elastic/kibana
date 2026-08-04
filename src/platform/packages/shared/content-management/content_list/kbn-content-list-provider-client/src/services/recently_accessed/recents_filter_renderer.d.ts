import React from 'react';
import { type Query } from '@elastic/eui';
import type { RecentlyAccessedHistorySource } from './types';
export declare const RECENT_FIELD = "recent";
/**
 * Props for {@link RecentsFilterRenderer}.
 *
 * `EuiSearchBar`'s `custom_component` filters receive `query` and `onChange`.
 * The toolbar's `filter.createComponent` does not forward declarative
 * attributes, so the recently-accessed source and label are bound via
 * closure when the renderer is registered (see
 * {@link useRecentlyAccessedDecoration}).
 */
export interface RecentsFilterRendererProps {
    /** Query object from `EuiSearchBar`. */
    query?: Query;
    /** `onChange` callback from `EuiSearchBar`. */
    onChange?: (query: Query) => void;
    /**
     * Recently-accessed source to read from. The renderer reads `.get()`
     * synchronously to determine whether to show itself.
     */
    service: RecentlyAccessedHistorySource;
    /** Optional label override. Defaults to "Recent". */
    label?: string;
    /** Optional `data-test-subj`. */
    'data-test-subj'?: string;
}
/**
 * Renders an `EuiFilterButton` that toggles `is:recent` in the
 * `EuiSearchBar` query — visible only when the recently-accessed source has
 * at least one entry.
 *
 * The companion `useRecentlyAccessedDecoration` hook builds a
 * `filter.createComponent`-wrapped form of this renderer, so consumers
 * normally do not import this directly.
 */
export declare const RecentsFilterRenderer: ({ query, onChange, service, label, "data-test-subj": dataTestSubj, }: RecentsFilterRendererProps) => React.JSX.Element | null;
