import { type MutableRefObject } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLCallbacks, ESQLControlVariable, ESQLRegistrySolutionId } from '@kbn/esql-types';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ILicense } from '@kbn/licensing-types';
import type { MapCache } from 'lodash';
import type { FavoritesClient } from '@kbn/content-management-favorites-public';
import type { getEsqlColumns, getESQLSources } from '@kbn/esql-utils';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { getHistoryItems } from '../history_local_storage';
import type { ESQLEditorDeps } from '../types';
import type { StarredQueryMetadata } from '../editor_footer/esql_starred_queries_service';
type MemoizedFn<TArgs extends unknown[], TResult> = (...args: TArgs) => {
    timestamp: number;
    result: TResult;
};
type MemoizedFieldsFromESQL = MemoizedFn<[
    {
        esqlQuery: string;
        search: ISearchGeneric;
        timeRange: TimeRange;
        signal?: AbortSignal;
        dropNullColumns?: boolean;
        variables?: ESQLControlVariable[];
    }
], ReturnType<typeof getEsqlColumns>>;
type MemoizedSources = MemoizedFn<[
    CoreStart,
    (() => Promise<ILicense | undefined>) | undefined,
    ((sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>) | undefined
], ReturnType<typeof getESQLSources>>;
type MemoizedHistoryStarredItems = MemoizedFn<[
    typeof getHistoryItems,
    FavoritesClient<StarredQueryMetadata>
], Promise<string[]>>;
interface UseEsqlCallbacksParams {
    core: CoreStart;
    data: ESQLEditorDeps['data'];
    kql?: ESQLEditorDeps['kql'];
    fieldsMetadata?: ESQLEditorDeps['fieldsMetadata'];
    esqlService?: ESQLEditorDeps['esql'];
    histogramBarTarget: number;
    activeSolutionId?: ESQLRegistrySolutionId;
    minimalQueryRef: MutableRefObject<string>;
    dataSourcesCache: MapCache;
    memoizedSources: MemoizedSources;
    esqlFieldsCache: MapCache;
    memoizedFieldsFromESQL: MemoizedFieldsFromESQL;
    historyStarredItemsCache: MapCache;
    memoizedHistoryStarredItems: MemoizedHistoryStarredItems;
    favoritesClient: FavoritesClient<StarredQueryMetadata>;
    getJoinIndicesCallback: Required<ESQLCallbacks>['getJoinIndices'];
    enableResourceBrowser: boolean;
}
export declare const useEsqlCallbacks: ({ core, data, kql, fieldsMetadata, esqlService, histogramBarTarget, activeSolutionId, minimalQueryRef, dataSourcesCache, memoizedSources, esqlFieldsCache, memoizedFieldsFromESQL, historyStarredItemsCache, memoizedHistoryStarredItems, favoritesClient, getJoinIndicesCallback, enableResourceBrowser, }: UseEsqlCallbacksParams) => ESQLCallbacks;
export {};
