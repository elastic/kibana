import React, { type PropsWithChildren } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { BehaviorSubject } from 'rxjs';
import type { UnifiedHistogramPartialLayoutProps } from '@kbn/unified-histogram';
import type { DiscoverDataStateContainer } from '../discover_data_state_container';
import type { ConnectedCustomizationService } from '../../../../customizations';
import type { ScopedProfilesManager } from '../../../../context_awareness';
import type { TabState } from './types';
import type { ScopedDiscoverEBTManager } from '../../../../ebt_manager';
import type { CascadedDocumentsStateManager } from '../../data_fetching/cascaded_documents_fetcher';
import { CascadedDocumentsFetcher } from '../../data_fetching/cascaded_documents_fetcher';
import type { DiscoverServices } from '../../../../build_services';
interface DiscoverRuntimeState {
    adHocDataViews: DataView[];
}
export declare const DEFAULT_HISTOGRAM_KEY_PREFIX = "discover";
export interface UnifiedHistogramConfig {
    localStorageKeyPrefix?: string;
    layoutPropsMap: Record<string, UnifiedHistogramPartialLayoutProps | undefined>;
}
interface TabRuntimeState {
    dataStateContainer?: DiscoverDataStateContainer;
    customizationService?: ConnectedCustomizationService;
    unifiedHistogramConfig: UnifiedHistogramConfig;
    scopedProfilesManager: ScopedProfilesManager;
    scopedEbtManager: ScopedDiscoverEBTManager;
    cascadedDocumentsFetcher: CascadedDocumentsFetcher;
    currentDataView: DataView;
    unsubscribeFn: (() => void) | undefined;
}
type ReactiveRuntimeState<TState, TNullable extends keyof TState = never> = {
    [key in keyof TState & string as `${key}$`]: BehaviorSubject<key extends TNullable ? TState[key] | undefined : TState[key]>;
};
export type ReactiveTabRuntimeState = ReactiveRuntimeState<TabRuntimeState, 'currentDataView'>;
export type RuntimeStateManager = ReactiveRuntimeState<DiscoverRuntimeState> & {
    tabs: {
        byId: Record<string, ReactiveTabRuntimeState>;
    };
};
export declare const createRuntimeStateManager: () => RuntimeStateManager;
export type InitialUnifiedHistogramLayoutProps = Pick<UnifiedHistogramPartialLayoutProps, 'topPanelHeight'>;
type InitialUnifiedHistogramLayoutPropsMap = Record<string, InitialUnifiedHistogramLayoutProps | undefined>;
export declare const createTabRuntimeState: ({ services, cascadedDocumentsStateManager, initialValues, }: {
    services: DiscoverServices;
    cascadedDocumentsStateManager: CascadedDocumentsStateManager;
    initialValues?: {
        unifiedHistogramLayoutPropsMap?: InitialUnifiedHistogramLayoutPropsMap;
    };
}) => ReactiveTabRuntimeState;
export declare const useRuntimeState: <T>(stateSubject$: BehaviorSubject<T>) => T;
export declare const selectTabRuntimeState: (runtimeStateManager: RuntimeStateManager, tabId: string) => ReactiveTabRuntimeState;
export declare const selectDataSourceProfileId: (runtimeStateManager: RuntimeStateManager, tabId: string) => string;
export declare const selectIsDataViewUsedInMultipleRuntimeTabStates: (runtimeStateManager: RuntimeStateManager, dataViewId: string) => boolean;
export declare const selectTabRuntimeInternalState: ({ runtimeStateManager, tabState, services, }: {
    runtimeStateManager: RuntimeStateManager;
    tabState: TabState;
    services: DiscoverServices;
}) => TabState["initialInternalState"] | undefined;
export declare const selectInitialUnifiedHistogramLayoutPropsMap: (runtimeStateManager: RuntimeStateManager, tabId: string) => InitialUnifiedHistogramLayoutPropsMap;
export declare const useCurrentTabRuntimeState: <T>(selector: (tab: ReactiveTabRuntimeState) => BehaviorSubject<T>) => T;
export declare const useCurrentTabDataStateContainer: () => DiscoverDataStateContainer;
export type CombinedRuntimeState = DiscoverRuntimeState & Pick<TabRuntimeState, 'currentDataView'>;
export declare const RuntimeStateProvider: ({ currentDataView, adHocDataViews, children, }: PropsWithChildren<CombinedRuntimeState>) => React.JSX.Element;
export declare const useCurrentDataView: () => DataView;
export declare const useAdHocDataViews: () => DataView[];
export declare const RuntimeStateManagerProvider: React.Provider<RuntimeStateManager | undefined>;
export declare const useRuntimeStateManager: () => RuntimeStateManager;
export {};
