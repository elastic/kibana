import { type DataView } from '@kbn/data-views-plugin/common';
import { type AggregateQuery, type Query, type TimeRange } from '@kbn/es-query';
import { type InternalStateThunkActionCreator, type TabActionPayload } from '../internal_state';
import type { DiscoverAppState, TabState, UpdateESQLQueryActionPayload } from '../types';
export interface RawAppStatePayload {
    appState: DiscoverAppState;
    /**
     * Marks app state changes that come from URL syncing or other internal updates
     * instead of direct user actions. These updates skip profile state snapshot
     * syncing so they do not overwrite restorable profile state. This should
     * rarely be needed outside of URL syncing and specific edge cases.
     */
    isSystemTriggered?: boolean;
}
type AppStatePayload = TabActionPayload<RawAppStatePayload>;
export declare const setAppState: InternalStateThunkActionCreator<[AppStatePayload]>;
export declare const syncProfileStateSnapshot: InternalStateThunkActionCreator<[
    TabActionPayload<{
        appState?: DiscoverAppState;
    }>
]>;
/**
 * Partially update the tab app state, merging with existing state and pushing to URL history
 */
export declare const updateAppState: InternalStateThunkActionCreator<[AppStatePayload]>;
/**
 * Partially update the tab app state, merging with existing state and replacing URL history
 */
export declare const updateAppStateAndReplaceUrl: InternalStateThunkActionCreator<[
    AppStatePayload
], Promise<void>>;
type GlobalStatePayload = TabActionPayload<Pick<TabState, 'globalState'>>;
/**
 * Partially update the tab global state, merging with existing state and pushing to URL history
 */
export declare const updateGlobalState: InternalStateThunkActionCreator<[GlobalStatePayload]>;
type AttributesPayload = TabActionPayload<{
    attributes: Partial<TabState['attributes']>;
}>;
/**
 * Partially update the tab attributes, merging with existing state
 */
export declare const updateAttributes: InternalStateThunkActionCreator<[AttributesPayload]>;
/**
 * Partially update the tab global state, merging with existing state and replacing URL history
 */
export declare const updateGlobalStateAndReplaceUrl: InternalStateThunkActionCreator<[
    GlobalStatePayload
], Promise<void>>;
/**
 * Push the current tab app state and global state to the URL, replacing URL history
 */
export declare const pushCurrentTabStateToUrl: InternalStateThunkActionCreator<[
    TabActionPayload
], Promise<void>>;
/**
 * Triggered when transitioning from ESQL to Dataview
 * Clean ups the ES|QL query and moves to the dataview mode
 */
export declare const transitionFromESQLToDataView: InternalStateThunkActionCreator<[
    TabActionPayload<{
        dataViewId: string;
    }>
]>;
/**
 * Triggered when transitioning from ESQL to Dataview
 * Clean ups the ES|QL query and moves to the dataview mode
 */
export declare const transitionFromDataViewToESQL: InternalStateThunkActionCreator<[
    TabActionPayload<{
        dataView: DataView;
    }>
]>;
/**
 * Updates the ES|QL query string
 */
export declare const updateESQLQuery: InternalStateThunkActionCreator<[UpdateESQLQueryActionPayload]>;
/**
 * Triggered when a user submits a query in the search bar
 */
export declare const onQuerySubmit: InternalStateThunkActionCreator<[
    TabActionPayload<{
        payload: {
            dateRange: TimeRange;
            query?: Query | AggregateQuery;
        };
        isUpdate?: boolean;
    }>
]>;
/**
 * Triggers fetching of new data from Elasticsearch
 * If initial is true, when SEARCH_ON_PAGE_LOAD_SETTING is set to false and it's a new saved search no fetch is triggered
 */
export declare const fetchData: InternalStateThunkActionCreator<[
    TabActionPayload<{
        initial?: boolean;
    }>
]>;
/**
 * Pause auto refresh interval if the data view is not time-based or is a rollup
 */
export declare const pauseAutoRefreshInterval: InternalStateThunkActionCreator<[
    TabActionPayload<{
        dataView: DataView;
    }>
]>;
export {};
