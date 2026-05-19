import type { CoreStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import type { ESQLControlVariable, ESQLSourceResult } from '@kbn/esql-types';
import type { ISearchGeneric } from '@kbn/search-types';
import type { TimeRange } from '@kbn/es-query';
import type { FavoritesClient } from '@kbn/content-management-favorites-public';
import type { StarredQueryMetadata } from '../editor_footer/esql_starred_queries_service';
interface UseMemoizedCachesParams {
    code: string;
    core: CoreStart;
    favoritesClient: FavoritesClient<StarredQueryMetadata>;
    pickerProjectRouting: string | undefined;
}
export declare const useMemoizedCaches: ({ code, core, favoritesClient, pickerProjectRouting, }: UseMemoizedCachesParams) => {
    esqlFieldsCache: import("lodash").MapCache;
    memoizedFieldsFromESQL: ((args_0: {
        esqlQuery: string;
        search: ISearchGeneric;
        timeRange: TimeRange;
        signal?: AbortSignal;
        dropNullColumns?: boolean;
        variables?: ESQLControlVariable[];
    }) => {
        timestamp: number;
        result: Promise<import("@kbn/esql-types").ESQLFieldWithMetadata[]>;
    }) & import("lodash").MemoizedFunction;
    dataSourcesCache: import("lodash").MapCache;
    memoizedSources: ((args_0: CoreStart, args_1: (() => Promise<ILicense | undefined>) | undefined, args_2: ((sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>) | undefined) => {
        timestamp: number;
        result: Promise<ESQLSourceResult[]>;
    }) & import("lodash").MemoizedFunction;
    historyStarredItemsCache: import("lodash").MapCache;
    memoizedHistoryStarredItems: ((args_0: (sortDirection: "desc" | "asc") => import("../history_local_storage").QueryHistoryItem[], args_1: FavoritesClient<StarredQueryMetadata>) => {
        timestamp: number;
        result: Promise<string[]>;
    }) & import("lodash").MemoizedFunction;
    minimalQuery: string;
    minimalQueryRef: import("react").MutableRefObject<string>;
    getJoinIndicesCallback: (cacheOptions?: {
        forceRefresh?: boolean;
    }) => Promise<{
        indices: import("@kbn/esql-types").IndexAutocompleteItem[];
    }>;
};
export {};
