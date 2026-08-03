import type { IndicesAutocompleteResult } from '@kbn/esql-types';
export declare const getTimeseriesIndices: (this: void | {
    forceRefresh?: boolean;
} | undefined, _http: import("@kbn/core/public").HttpSetup, _signal?: AbortSignal | undefined) => Promise<IndicesAutocompleteResult>;
