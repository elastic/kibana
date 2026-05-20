import { type TypedUseSelectorHook } from 'react-redux';
import type { PropsWithChildren } from 'react';
import React from 'react';
import type { DiscoverAppState, DiscoverInternalState, TabState } from './types';
import { type TabActionPayload, type InternalStateDispatch, type InternalStateStore } from './internal_state';
import { type TabActionInjector } from './utils';
import type { ChartPortalNode } from '../../components/chart';
export declare const InternalStateProvider: ({ store, children, }: PropsWithChildren<{
    store: InternalStateStore;
}>) => React.JSX.Element;
export declare const useInternalStateDispatch: () => InternalStateDispatch;
export declare const useInternalStateGetState: () => (() => DiscoverInternalState);
export declare const useInternalStateSubscribe: () => ((listener: () => void) => () => void);
export declare const useInternalStateSelector: TypedUseSelectorHook<DiscoverInternalState>;
interface CurrentTabContextValue {
    currentTabId: string;
    currentChartPortalNode?: ChartPortalNode;
    injectCurrentTab: TabActionInjector;
}
export declare const CurrentTabProvider: ({ currentTabId, currentChartPortalNode, children, }: PropsWithChildren<{
    currentTabId: string;
    currentChartPortalNode?: ChartPortalNode;
}>) => React.JSX.Element;
export declare const useCurrentTabContext: () => CurrentTabContextValue;
export declare const useCurrentTabSelector: TypedUseSelectorHook<TabState>;
export declare const useAppStateSelector: <T>(selector: (state: DiscoverAppState) => T) => T;
export declare const useCurrentTabAction: <TPayload extends TabActionPayload, TReturn>(actionCreator: (params: TPayload) => TReturn) => (payload: Exclude<keyof TPayload, "tabId"> extends never ? void : Exclude<keyof TPayload, "tabId"> extends infer T extends keyof TPayload ? { [P in T]: TPayload[P]; } : never) => TReturn;
export declare const useCurrentChartPortalNode: () => ChartPortalNode | undefined;
export declare const useDataViewsForPicker: () => {
    savedDataViews: import("../../../../../../data_views/common").DataViewListItem[];
    adHocDataViews: import("@kbn/kql/server/data_views").DataView[];
};
export {};
