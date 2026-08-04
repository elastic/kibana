import type { ESQLSourceResult, EsqlDatasetsResult, IndexAutocompleteItem } from '@kbn/esql-types';
export interface UseAllSourcesParams {
    isOpen: boolean;
    preloadedSources?: ESQLSourceResult[];
    isTimeseries: boolean;
    getSources: () => Promise<ESQLSourceResult[]>;
    getTimeseriesIndices: () => Promise<{
        indices: IndexAutocompleteItem[];
    }>;
    getDatasets?: () => Promise<EsqlDatasetsResult>;
}
export declare const useAllSources: ({ isOpen, preloadedSources, isTimeseries, getSources, getTimeseriesIndices, getDatasets, }: UseAllSourcesParams) => {
    allSources: ESQLSourceResult[];
    isLoading: boolean;
};
