import type { HttpStart } from '@kbn/core/public';
import type { ESQLFieldWithMetadata, RecommendedField, ESQLRegistrySolutionId } from '@kbn/esql-types';
import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
export interface UseAllFieldsParams {
    isOpen: boolean;
    preloadedFields: Array<{
        name: string;
        type?: string;
    }>;
    indexPattern: string;
    fullQuery: string;
    http?: HttpStart;
    activeSolutionId?: ESQLRegistrySolutionId;
    search?: ISearchGeneric;
    getTimeRange?: () => TimeRange;
    signal?: AbortSignal;
}
export declare const useAllFields: ({ isOpen, preloadedFields, indexPattern, fullQuery, http, activeSolutionId, search, getTimeRange, signal, }: UseAllFieldsParams) => {
    allFields: ESQLFieldWithMetadata[];
    recommendedFields: RecommendedField[];
    isLoading: boolean;
};
