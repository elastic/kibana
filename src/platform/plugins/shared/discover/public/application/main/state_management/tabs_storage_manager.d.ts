import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { type IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { type DiscoverAppState, type RecentlyClosedTabState, type TabState } from './redux';
import type { TabsUrlState } from '../../../../common/types';
export declare const TABS_LOCAL_STORAGE_KEY = "discover.tabs";
export declare const RECENTLY_CLOSED_TABS_LIMIT = 50;
export type TabStateInLocalStorage = Pick<TabState, 'id' | 'label'> & {
    internalState: TabState['initialInternalState'] | undefined;
    attributes: TabState['attributes'] | undefined;
    appState: DiscoverAppState | undefined;
    globalState: TabState['globalState'] | undefined;
};
export interface TabsInternalStatePayload {
    allTabs: TabState[];
    selectedTabId: string;
    recentlyClosedTabs: RecentlyClosedTabState[];
}
export interface TabsStorageManager {
    /**
     * Supports two-way sync of the selected tab id with the URL.
     */
    startUrlSync: (props: {
        onChanged?: (nextState: TabsUrlState) => void;
    }) => () => void;
    pushSelectedTabIdToUrl: (selectedTabId: string, options?: {
        replace?: boolean;
    }) => Promise<void>;
    persistLocally: (props: Omit<TabsInternalStatePayload, 'selectedTabId'>, getInternalState: (tabId: string) => TabState['initialInternalState'] | undefined, discoverSessionId: string | undefined) => Promise<void>;
    updateTabStateLocally: (tabId: string, tabState: Pick<TabStateInLocalStorage, 'internalState' | 'attributes' | 'appState' | 'globalState'>) => void;
    loadLocally: (props: {
        userId: string;
        spaceId: string;
        persistedDiscoverSession?: DiscoverSession;
        shouldClearAllTabs?: boolean;
        defaultTabState: Omit<TabState, keyof TabItem>;
    }) => TabsInternalStatePayload;
    getNRecentlyClosedTabs: (params: {
        previousOpenTabs: TabState[];
        previousRecentlyClosedTabs: RecentlyClosedTabState[];
        nextOpenTabs: TabState[];
        justRemovedTabs?: TabState[];
    }) => RecentlyClosedTabState[];
}
export declare const createTabsStorageManager: ({ urlStateStorage, storage, enabled, }: {
    urlStateStorage: IKbnUrlStateStorage;
    storage: Storage;
    enabled?: boolean;
}) => TabsStorageManager;
