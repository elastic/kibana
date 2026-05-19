import type { BehaviorSubject } from 'rxjs';
import type { FetchContext, HasParentApi, PublishesDataViews, PublishesTitle, PublishesSavedObjectId, PublishesDataLoading, PublishesBlockingError } from '@kbn/presentation-publishing';
import type { PublishesWritableTimeRange } from '@kbn/presentation-publishing/interfaces/fetch/publishes_unified_search';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import type { DiscoverServices } from '../build_services';
import type { PublishesSavedSearch, SearchEmbeddableStateManager } from './types';
import type { ScopedProfilesManager } from '../context_awareness';
type SavedSearchPartialFetchApi = PublishesSavedSearch & PublishesSavedObjectId & PublishesBlockingError & PublishesDataLoading & PublishesDataViews & PublishesTitle & PublishesWritableTimeRange & {
    fetchContext$: BehaviorSubject<FetchContext | undefined>;
    fetchWarnings$: BehaviorSubject<SearchResponseIncompleteWarning[]>;
} & Partial<HasParentApi>;
export declare const isEsqlMode: (savedSearch: Pick<SavedSearch, "searchSource">) => boolean;
export declare function initializeFetch({ api, stateManager, discoverServices, scopedProfilesManager, refreshTrigger$, setDataLoading, setBlockingError, }: {
    api: SavedSearchPartialFetchApi;
    stateManager: SearchEmbeddableStateManager;
    discoverServices: DiscoverServices;
    scopedProfilesManager: ScopedProfilesManager;
    refreshTrigger$: BehaviorSubject<void>;
    setDataLoading: (dataLoading: boolean | undefined) => void;
    setBlockingError: (error: Error | undefined) => void;
}): () => void;
export {};
