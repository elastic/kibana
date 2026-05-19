import type { DataViewSpec } from '@kbn/data-plugin/common';
import type { TabItem } from '@kbn/unified-tabs';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { UISession } from '@kbn/data-plugin/public/search/session/sessions_mgmt/types';
import type { OpenInNewTabParams } from '../../../../../context_awareness/types';
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
export declare const initializeTabs: import("@reduxjs/toolkit").AsyncThunk<{
    userId: string;
    spaceId: string;
    persistedDiscoverSession: DiscoverSession | undefined;
}, {
    discoverSessionId: string | undefined;
    shouldClearAllTabs?: boolean;
}, {
    state: import("../types").DiscoverInternalState;
    dispatch: import("../internal_state").InternalStateDispatch;
    extra: import("../internal_state").InternalStateDependencies;
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
    }
]>;
export declare const openInNewTabExtPointAction: InternalStateThunkActionCreator<[OpenInNewTabParams]>;
export declare const openSearchSessionInNewTab: InternalStateThunkActionCreator<[
    {
        searchSession: UISession;
    }
]>;
export declare const clearRecentlyClosedTabs: InternalStateThunkActionCreator;
export declare const disconnectTab: InternalStateThunkActionCreator<[TabActionPayload]>;
