import type { ContentListClientState, ContentListAction } from './types';
/**
 * Default selection state.
 */
export declare const DEFAULT_SELECTION: {
    selectedIds: string[];
};
/**
 * State reducer for client-controlled state.
 *
 * Handles user-driven state mutations (query text, sort, pagination, selection).
 * Query data (items, loading, error) is managed by React Query directly.
 *
 * Selection is cleared whenever the query text, sort, or pagination changes so that
 * `selectedIds` never references items the user can no longer see.
 */
export declare const reducer: (state: ContentListClientState, action: ContentListAction) => ContentListClientState;
