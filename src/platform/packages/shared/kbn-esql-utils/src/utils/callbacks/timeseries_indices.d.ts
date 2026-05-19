import type { IndicesAutocompleteResult } from '@kbn/esql-types';
export declare const getTimeseriesIndices: (this: void | {
    forceRefresh?: boolean;
} | undefined, http: import("@kbn/core/public").HttpSetup) => Promise<IndicesAutocompleteResult>;
