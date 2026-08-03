import type { DataPublicPluginStart, SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { ReactiveTabRuntimeState, TabState } from '../redux';
import type { RuntimeStateManager } from '../redux/runtime_state';
import type { ProfileStateRegistry } from '../../../../../common/context_awareness';
export declare function createSearchSessionRestorationDataProvider(deps: {
    data: DataPublicPluginStart;
    getPersistedDiscoverSession: () => DiscoverSession | undefined;
    getCurrentTab: () => TabState;
    getCurrentTabRuntimeState: () => ReactiveTabRuntimeState;
    profileStateRegistry: ProfileStateRegistry;
    runtimeStateManager: RuntimeStateManager;
}): SearchSessionInfoProvider;
