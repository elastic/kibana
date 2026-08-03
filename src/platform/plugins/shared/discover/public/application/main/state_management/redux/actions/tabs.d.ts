import type { DataViewSpec } from '@kbn/data-plugin/common';
import type { TabItem } from '@kbn/unified-tabs';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { UISession } from '@kbn/data-plugin/public/search/session/sessions_mgmt/types';
import type { OpenInNewTabParams } from '../../../../../context_awareness/types';
import { type ProfileStateMap } from '../../../../../../common/context_awareness';
import type { TabState } from '../types';
import { internalStateSlice, type TabActionPayload, type InternalStateThunkActionCreator } from '../internal_state';
export declare const setTabs: InternalStateThunkActionCreator<[
    Parameters<typeof internalStateSlice.actions.setTabs>[0]
]>;
export declare const updateTabs: InternalStateThunkActionCreator<[
    {
        items: TabState[] | TabItem[];
        selectedItem: TabState | TabItem | null;
        updatedDiscoverSession?: DiscoverSession;
    },
    void
], Promise<void>>;
export declare const initializeTabs: import("redux-toolkit-v1").AsyncThunk<{
    userId: string;
    spaceId: string;
    persistedDiscoverSession: DiscoverSession | undefined;
}, {
    discoverSessionId: string | undefined;
    shouldClearAllTabs?: boolean;
}, {
    state: import("..").DiscoverInternalState;
    dispatch: import("..").InternalStateDispatch;
    extra: import("..").InternalStateDependencies;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const restoreTab: InternalStateThunkActionCreator<[{
    restoreTabId: string;
}]>;
export declare const openInNewTab: InternalStateThunkActionCreator<[
    {
        tabLabel?: string;
        appState?: TabState['appState'];
        globalState?: TabState['globalState'];
        searchSessionId?: string;
        dataViewSpec?: DataViewSpec;
        profileState?: ProfileStateMap;
    }
], Promise<void>>;
export declare const openInNewTabExtPointAction: InternalStateThunkActionCreator<[
    OpenInNewTabParams
], Promise<void>>;
export declare const openSearchSessionInNewTab: InternalStateThunkActionCreator<[
    {
        searchSession: UISession;
    }
], Promise<void>>;
export declare const clearRecentlyClosedTabs: InternalStateThunkActionCreator;
export declare const disconnectTab: InternalStateThunkActionCreator<[TabActionPayload]>;
