import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DiscoverServices } from '../../../build_services';
import type { DiscoverSearchSessionManager } from './discover_search_session';
import { FetchStatus } from '../../types';
import type { InternalStateStore, RuntimeStateManager, TabActionInjector, TabState } from './redux';
export interface SavedSearchData {
    main$: DataMain$;
    documents$: DataDocuments$;
    totalHits$: DataTotalHits$;
}
export type DataMain$ = BehaviorSubject<DataMainMsg>;
export type DataDocuments$ = BehaviorSubject<DataDocumentsMsg>;
export type DataTotalHits$ = BehaviorSubject<DataTotalHitsMsg>;
export type DataRefetch$ = Subject<DataRefetchMsg>;
export type DataRefetchMsg = 'reset' | 'fetch_more' | undefined;
export interface DataMsg {
    fetchStatus: FetchStatus;
    error?: Error;
    query?: AggregateQuery | Query | undefined;
}
export interface DataMainMsg extends DataMsg {
    foundDocuments?: boolean;
}
export interface DataDocumentsMsg extends DataMsg {
    result?: DataTableRecord[];
    esqlQueryColumns?: DatatableColumn[];
    esqlHeaderWarning?: string;
    interceptedWarnings?: SearchResponseWarning[];
}
export interface DataTotalHitsMsg extends DataMsg {
    result?: number;
}
export interface DiscoverLatestFetchDetails {
    abortController?: AbortController;
}
export interface DiscoverDataStateContainer {
    /**
     * Implicitly starting fetching data from ES
     */
    fetch: () => void;
    /**
     * Fetch more data from ES
     */
    fetchMore: () => void;
    /**
     * Container of data observables (orchestration, data table, total hits, available fields)
     */
    data$: SavedSearchData;
    /**
     * Observable triggering fetching data from ES
     */
    refetch$: DataRefetch$;
    /**
     * Emits when the chart should be fetched
     */
    fetchChart$: Observable<DiscoverLatestFetchDetails | null>;
    /**
     * Used to disable the next fetch that would otherwise be triggered by a URL state change
     */
    disableNextFetchOnStateChange$: BehaviorSubject<boolean>;
    /**
     * Start subscribing to other observables that trigger data fetches
     */
    subscribe: () => () => void;
    /**
     * resetting all data observable to initial state
     */
    reset: () => void;
    /**
     * cancels the running queries
     */
    cancel: () => void;
    /**
     * gets active AbortController for running queries
     */
    getAbortController: () => AbortController;
    /**
     * Available Inspector Adaptor allowing to get details about recent requests to ES
     */
    inspectorAdapters: {
        requests: RequestAdapter;
        lensRequests?: RequestAdapter;
    };
    /**
     * Return the initial fetch status
     *  UNINITIALIZED: data is not fetched initially, without user triggering it
     *  LOADING: data is fetched initially (when Discover is rendered, or data views are switched)
     */
    getInitialFetchStatus: () => FetchStatus;
    /**
     * Clean up ES|QL state when saved search changes
     */
    cleanupEsql: () => void;
}
/**
 * Container responsible for fetching of data in Discover Main
 * Either by triggering requests to Elasticsearch directly, or by
 * orchestrating unified plugins / components like the histogram
 */
export declare function getDataStateContainer({ services, searchSessionManager, internalState, runtimeStateManager, injectCurrentTab, getCurrentTab, }: {
    services: DiscoverServices;
    searchSessionManager: DiscoverSearchSessionManager;
    internalState: InternalStateStore;
    runtimeStateManager: RuntimeStateManager;
    injectCurrentTab: TabActionInjector;
    getCurrentTab: () => TabState;
}): DiscoverDataStateContainer;
