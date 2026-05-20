import type { Adapters } from '@kbn/inspector-plugin/common';
import type { ISearchSource } from '@kbn/data-plugin/common';
import { FetchStatus } from '../../types';
import type { SavedSearchData } from '../state_management/discover_data_state_container';
import type { DiscoverServices } from '../../../build_services';
import type { InternalStateStore, TabState } from '../state_management/redux';
import type { ScopedProfilesManager } from '../../../context_awareness';
import type { ScopedDiscoverEBTManager } from '../../../ebt_manager';
export interface CommonFetchParams {
    dataSubjects: SavedSearchData;
    abortController: AbortController;
    internalState: InternalStateStore;
    initialFetchStatus: FetchStatus;
    inspectorAdapters: Adapters;
    searchSource: ISearchSource;
    searchSessionId: string;
    services: DiscoverServices;
    scopedProfilesManager: ScopedProfilesManager;
    scopedEbtManager: ScopedDiscoverEBTManager;
    getCurrentTab: () => TabState;
}
/**
 * This function starts fetching all required queries in Discover. This will be the query to load the individual
 * documents as well as any other requests that might be required to load the main view.
 *
 * This method returns a promise, which will resolve (without a value), as soon as all queries that have been started
 * have been completed (failed or successfully).
 */
export declare function fetchAll(params: CommonFetchParams & {
    reset: boolean;
    onFetchRecordsComplete?: () => Promise<void>;
}): Promise<void>;
export declare function fetchMoreDocuments(params: CommonFetchParams): Promise<void>;
