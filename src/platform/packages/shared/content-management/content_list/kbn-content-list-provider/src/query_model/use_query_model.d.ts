import type { ContentListQueryModel } from './types';
/**
 * Parse `queryText` into a {@link ContentListQueryModel}.
 *
 * This is a memoized view — the model is recomputed only when `queryText`
 * or field/flag definitions change. It is never stored in state.
 */
export declare const useQueryModel: (queryText: string) => ContentListQueryModel;
