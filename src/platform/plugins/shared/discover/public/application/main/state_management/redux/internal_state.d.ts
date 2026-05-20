import type { DataTableRecord } from '@kbn/discover-utils';
import { type Observable } from 'rxjs';
import { type PayloadAction, type ThunkAction, type ThunkDispatch } from '@reduxjs/toolkit';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { UnifiedDataTableRestorableState } from '@kbn/unified-data-table';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
import { type RuntimeStateManager } from './runtime_state';
import { TabsBarVisibility, type DiscoverInternalState, type TabState, type RecentlyClosedTabState } from './types';
import { type RawAppStatePayload } from './actions';
import { type HasUnsavedChangesResult } from './selectors';
import type { TabsStorageManager } from '../tabs_storage_manager';
import type { DiscoverSearchSessionManager } from '../discover_search_session';
import type { CascadedDocumentsStateManager } from '../../data_fetching/cascaded_documents_fetcher';
export type TabActionPayload<T extends object = object> = {
    tabId: string;
} & T;
type TabAction<T extends object = object> = PayloadAction<TabActionPayload<T>>;
export declare const internalStateSlice: import("@reduxjs/toolkit").Slice<DiscoverInternalState, {
    setInitializationState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: PayloadAction<DiscoverInternalState["initializationState"]>) => void;
    setTabs: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: PayloadAction<{
        allTabs: TabState[];
        selectedTabId: string;
        recentlyClosedTabs: RecentlyClosedTabState[];
        updatedDiscoverSession?: DiscoverSession;
    }>) => void;
    setUnsavedChanges: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: PayloadAction<HasUnsavedChangesResult>) => void;
    disconnectTab: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction) => void;
    setForceFetchOnSelect: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "forceFetchOnSelect">>) => void;
    setIsDataViewLoading: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "isDataViewLoading">>) => void;
    setDefaultProfileAdHocDataViewIds: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: PayloadAction<string[]>) => void;
    setDefaultProfileEsqlQuery: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: PayloadAction<DiscoverInternalState["defaultProfileEsqlQuery"]>) => void;
    setTabsBarVisibility: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: PayloadAction<TabsBarVisibility>) => void;
    markNonActiveTabsForRefetch: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>) => void;
    setExpandedDoc: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        expandedDoc: DataTableRecord | undefined;
        expandedDocOwner?: string;
        initialDocViewerTabId?: string;
        initialDocViewerTabState?: object;
    }>) => void;
    setRenderDocumentViewMeta: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "renderDocumentViewMeta">>) => void;
    setInitialDocViewerTabId: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        initialDocViewerTabId: string | undefined;
    }>) => void;
    setDataRequestParams: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "dataRequestParams">>) => void;
    /**
     * Set the tab global state, overwriting existing state and pushing to URL history
     */
    setGlobalState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "globalState">>) => void;
    /**
     * Set the tab app state, overwriting existing state and pushing to URL history
     */
    setAppState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<RawAppStatePayload & {
        profileId: string;
    }>) => void;
    syncProfileStateSnapshot: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        profileId: string;
        appState?: TabState["appState"];
    }>) => void;
    /**
     * Set the tab app state and previous app state, overwriting existing state and pushing to URL history
     */
    resetAppState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "appState">>) => void;
    /**
     * Set the tab attributes state
     */
    setAttributes: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "attributes">>) => void;
    setOverriddenVisContextAfterInvalidation: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "overriddenVisContextAfterInvalidation">>) => void;
    setCascadedDocumentsState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState, "cascadedDocumentsState">>) => void;
    setSelectedCascadeGroups: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, actions: TabAction<Pick<TabState["cascadedDocumentsState"], "selectedCascadeGroups">>) => void;
    setEsqlVariables: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        esqlVariables: ESQLControlVariable[] | undefined;
    }>) => void;
    setIsESQLToDataViewTransitionModalVisible: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: PayloadAction<boolean>) => void;
    setProfileStateFieldsToReset: {
        prepare: (payload: TabActionPayload<Pick<TabState["defaultProfileState"], "fieldsToReset">>) => {
            payload: {
                fieldsToReset: {
                    fieldsToReset: import("./types").DefaultProfileStateFields;
                    resetId: string;
                };
                tabId: string;
            };
        };
        reducer: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
            fieldsToReset: Pick<TabState["defaultProfileState"], "fieldsToReset" | "resetId">;
        }>) => void;
    };
    setProfileStateFieldsToResetWithoutResetId: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<Pick<TabState["defaultProfileState"], "fieldsToReset">>) => void;
    resetOnSavedSearchChange: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction) => void;
    setESQLEditorUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        esqlEditorUiState: Partial<TabState["uiState"]["esqlEditor"]>;
    }>) => void;
    setDataGridUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        dataGridUiState: Partial<TabState["uiState"]["dataGrid"]>;
    }>) => void;
    setFieldListUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        fieldListUiState: Partial<TabState["uiState"]["fieldList"]>;
    }>) => void;
    setFieldListExistingFieldsInfoUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        fieldListExistingFieldsInfo: TabState["uiState"]["fieldListExistingFieldsInfo"];
    }>) => void;
    resetAffectedFieldListExistingFieldsInfoUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: PayloadAction<{
        dataViewId: string;
    }>) => void;
    setLayoutUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        layoutUiState: Partial<TabState["uiState"]["layout"]>;
    }>) => void;
    setSearchDraftUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        searchDraftUiState: Partial<TabState["uiState"]["searchDraft"]>;
    }>) => void;
    setMetricsGridState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        metricsGridState: Partial<TabState["uiState"]["metricsGrid"]>;
    }>) => void;
    setDocViewerUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        docViewerUiState: Partial<TabState["uiState"]["docViewer"]>;
    }>) => void;
    setDataCascadeUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        dataCascadeUiState: TabState["uiState"]["dataCascade"];
    }>) => void;
    setCascadedDocumentsDataGridUiState: (state: import("immer/dist/internal").WritableDraft<DiscoverInternalState>, action: TabAction<{
        nodeId: string;
        dataGridUiState: Partial<UnifiedDataTableRestorableState>;
    }>) => void;
}, "internalState">;
export declare const syncLocallyPersistedTabState: import("@reduxjs/toolkit").ActionCreatorWithPayload<TabActionPayload<object>, string>;
export declare const discardFlyoutsOnTabChange: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"internalState/discardFlyoutsOnTabChange">;
export declare const transitionedFromEsqlToDataView: import("@reduxjs/toolkit").ActionCreatorWithPayload<TabActionPayload<object>, string>;
export declare const transitionedFromDataViewToEsql: import("@reduxjs/toolkit").ActionCreatorWithPayload<TabActionPayload<object>, string>;
export interface InternalStateDependencies {
    services: DiscoverServices;
    customizationContext: DiscoverCustomizationContext;
    runtimeStateManager: RuntimeStateManager;
    urlStateStorage: IKbnUrlStateStorage;
    tabsStorageManager: TabsStorageManager;
    searchSessionManager: DiscoverSearchSessionManager;
    getInternalState$: () => Observable<DiscoverInternalState>;
    getCascadedDocumentsStateManager: (tabId: string) => CascadedDocumentsStateManager;
}
export declare const createInternalStateStore: (options: Omit<InternalStateDependencies, "getInternalState$" | "getCascadedDocumentsStateManager">) => import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<DiscoverInternalState, import("redux").AnyAction, import("@reduxjs/toolkit").MiddlewareArray<[import("@reduxjs/toolkit").ListenerMiddleware<unknown, ThunkDispatch<unknown, unknown, import("redux").AnyAction>, InternalStateDependencies>, import("@reduxjs/toolkit").ThunkMiddleware<DiscoverInternalState, import("redux").AnyAction, InternalStateDependencies>]>>;
export type InternalStateStore = ReturnType<typeof createInternalStateStore>;
export type InternalStateDispatch = InternalStateStore['dispatch'];
type InternalStateThunkAction<TReturn = void> = ThunkAction<TReturn, InternalStateDispatch extends ThunkDispatch<infer TState, never, never> ? TState : never, InternalStateDispatch extends ThunkDispatch<never, infer TExtra, never> ? TExtra : never, InternalStateDispatch extends ThunkDispatch<never, never, infer TAction> ? TAction : never>;
export type InternalStateThunkActionCreator<TArgs extends unknown[] = [], TReturn = void> = (...args: TArgs) => InternalStateThunkAction<TReturn>;
export {};
