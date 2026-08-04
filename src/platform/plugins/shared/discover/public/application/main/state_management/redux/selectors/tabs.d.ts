import { type Filter } from '@kbn/es-query';
import type { DiscoverInternalState, TabState } from '../types';
import { TabsBarVisibility } from '../types';
export declare const selectTab: (state: DiscoverInternalState, tabId: string) => TabState;
export declare const selectTabAppState: (state: DiscoverInternalState, tabId: string) => import("..").DiscoverAppState;
export declare const selectTabCombinedFilters: ((state: TabState) => Filter[]) & import("reselect-v4/es").OutputSelectorFields<(args_0: Filter[] | undefined, args_1: Filter[] | undefined, args_2: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery | undefined) => Filter[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectAllTabs: ((state: DiscoverInternalState) => TabState[]) & import("reselect-v4/es").OutputSelectorFields<(args_0: string[], args_1: Record<string, TabState>) => TabState[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectRecentlyClosedTabs: ((state: DiscoverInternalState) => import("..").RecentlyClosedTabState[]) & import("reselect-v4/es").OutputSelectorFields<(args_0: string[], args_1: Record<string, import("..").RecentlyClosedTabState>) => import("..").RecentlyClosedTabState[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectIsTabsBarHidden: ((state: DiscoverInternalState) => boolean) & import("reselect-v4/es").OutputSelectorFields<(args_0: TabsBarVisibility) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectPersistedDiscoverSession: (state: DiscoverInternalState) => import("../../../../../../../saved_search/common").DiscoverSession | undefined;
export declare const selectSavedDataViews: (state: DiscoverInternalState) => import("../../../../../../../data_views/common").DataViewListItem[];
