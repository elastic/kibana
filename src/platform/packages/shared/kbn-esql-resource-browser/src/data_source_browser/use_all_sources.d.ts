import type { ESQLSourceResult, IndexAutocompleteItem } from '@kbn/esql-types';
export interface UseAllSourcesParams {
    isOpen: boolean;
    preloadedSources?: ESQLSourceResult[];
    isTimeseries: boolean;
    getSources: () => Promise<ESQLSourceResult[]>;
    getTimeseriesIndices: () => Promise<{
        indices: IndexAutocompleteItem[];
    }>;
}
export declare const useAllSources: ({ isOpen, preloadedSources, isTimeseries, getSources, getTimeseriesIndices, }: UseAllSourcesParams) => {
    allSources: ESQLSourceResult[];
    isLoading: boolean;
};
