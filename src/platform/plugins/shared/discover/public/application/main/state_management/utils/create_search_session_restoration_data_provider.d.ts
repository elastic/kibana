import type { DataPublicPluginStart, SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { ReactiveTabRuntimeState, TabState } from '../redux';
export declare function createSearchSessionRestorationDataProvider(deps: {
    data: DataPublicPluginStart;
    getPersistedDiscoverSession: () => DiscoverSession | undefined;
    getCurrentTab: () => TabState;
    getCurrentTabRuntimeState: () => ReactiveTabRuntimeState;
}): SearchSessionInfoProvider;
