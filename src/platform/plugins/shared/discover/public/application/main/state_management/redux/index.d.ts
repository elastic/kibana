import { internalStateSlice } from './internal_state';
import * as actions from './actions';
export { type DiscoverInternalState, type TabState, type TabStateGlobalState, type RecentlyClosedTabState, type DiscoverAppState, type InternalStateDataRequestParams, type CascadedDocumentsState, type DefaultProfileStateField, type DefaultProfileStateFields, type DefaultProfileState, type ProfileStateSnapshot, type UpdateESQLQueryActionPayload, DEFAULT_PROFILE_STATE_FIELDS, TabInitializationStatus, TabsBarVisibility, } from './types';
export { DEFAULT_EXPANDED_DOC_OWNER, DEFAULT_TAB_STATE } from './constants';
export { type InternalStateStore, type InternalStateDispatch, type InternalStateDependencies, createInternalStateStore, } from './internal_state';
export declare const internalStateActions: {
    syncLocallyPersistedTabState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<object>, string>;
    loadDataViewList: import("@reduxjs/toolkit").AsyncThunk<import("../../../../../../data_views/common").DataViewListItem[], void, {
        state: import("./types").DiscoverInternalState;
        dispatch: import("./internal_state").InternalStateDispatch;
        extra: import("./internal_state").InternalStateDependencies;
        rejectValue?: unknown;
        serializedErrorType?: unknown;
        pendingMeta?: unknown;
        fulfilledMeta?: unknown;
        rejectedMeta?: unknown;
    }>;
    setAdHocDataViews: import("./internal_state").InternalStateThunkActionCreator<[import("@kbn/kql/server/data_views").DataView[]]>;
    setDefaultProfileAdHocDataViews: import("./internal_state").InternalStateThunkActionCreator<[import("@kbn/kql/server/data_views").DataView[]]>;
    appendAdHocDataViews: import("./internal_state").InternalStateThunkActionCreator<[import("@kbn/kql/server/data_views").DataView | import("@kbn/kql/server/data_views").DataView[]]>;
    replaceAdHocDataViewWithId: import("./internal_state").InternalStateThunkActionCreator<[string, import("@kbn/kql/server/data_views").DataView]>;
    initializeSingleTab: import("@reduxjs/toolkit").AsyncThunk<{
        showNoDataPage: boolean;
    }, import("./internal_state").TabActionPayload<{
        initializeSingleTabParams: actions.InitializeSingleTabsParams;
    }>, {
        state: import("./types").DiscoverInternalState;
        dispatch: import("./internal_state").InternalStateDispatch;
        extra: import("./internal_state").InternalStateDependencies;
        rejectValue?: unknown;
        serializedErrorType?: unknown;
        pendingMeta?: unknown;
        fulfilledMeta?: unknown;
        rejectedMeta?: unknown;
    }>;
    setTabs: import("./internal_state").InternalStateThunkActionCreator<[Parameters<typeof internalStateSlice.actions.setTabs>[0]]>;
    updateTabs: import("./internal_state").InternalStateThunkActionCreator<[{
        items: import("./types").TabState[] | import("@kbn/unified-tabs").TabItem[];
        selectedItem: import("./types").TabState | import("@kbn/unified-tabs").TabItem | null;
        updatedDiscoverSession?: import("../../../../../../saved_search/common").DiscoverSession;
    }, void], Promise<void>>;
    initializeTabs: import("@reduxjs/toolkit").AsyncThunk<{
        userId: string;
        spaceId: string;
        persistedDiscoverSession: import("../../../../../../saved_search/common").DiscoverSession | undefined;
    }, {
        discoverSessionId: string | undefined;
        shouldClearAllTabs?: boolean;
    }, {
        state: import("./types").DiscoverInternalState;
        dispatch: import("./internal_state").InternalStateDispatch;
        extra: import("./internal_state").InternalStateDependencies;
        rejectValue?: unknown;
        serializedErrorType?: unknown;
        pendingMeta?: unknown;
        fulfilledMeta?: unknown;
        rejectedMeta?: unknown;
    }>;
    restoreTab: import("./internal_state").InternalStateThunkActionCreator<[{
        restoreTabId: string;
    }]>;
    openInNewTab: import("./internal_state").InternalStateThunkActionCreator<[{
        tabLabel?: string;
        appState?: import("./types").TabState["appState"];
        globalState?: import("./types").TabState["globalState"];
        searchSessionId?: string;
        dataViewSpec?: import("../../../../../../data_views/common").DataViewSpec;
    }]>;
    openInNewTabExtPointAction: import("./internal_state").InternalStateThunkActionCreator<[import("../../../../context_awareness").OpenInNewTabParams]>;
    openSearchSessionInNewTab: import("./internal_state").InternalStateThunkActionCreator<[{
        searchSession: import("../../../../../../data/public/search/session/sessions_mgmt/types").UISession;
    }]>;
    clearRecentlyClosedTabs: import("./internal_state").InternalStateThunkActionCreator;
    disconnectTab: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload]>;
    openDiscoverSession: import("@reduxjs/toolkit").AsyncThunk<void, {
        discoverSessionId: string;
    }, {
        state: import("./types").DiscoverInternalState;
        dispatch: import("./internal_state").InternalStateDispatch;
        extra: import("./internal_state").InternalStateDependencies;
        rejectValue?: unknown;
        serializedErrorType?: unknown;
        pendingMeta?: unknown;
        fulfilledMeta?: unknown;
        rejectedMeta?: unknown;
    }>;
    saveDiscoverSession: import("@reduxjs/toolkit").AsyncThunk<{
        discoverSession: import("../../../../../../saved_search/common").DiscoverSession | undefined;
        nextSelectedTabId: string;
    }, actions.SaveDiscoverSessionThunkParams, {
        state: import("./types").DiscoverInternalState;
        dispatch: import("./internal_state").InternalStateDispatch;
        extra: import("./internal_state").InternalStateDependencies;
        rejectValue?: unknown;
        serializedErrorType?: unknown;
        pendingMeta?: unknown;
        fulfilledMeta?: unknown;
        rejectedMeta?: unknown;
    }>;
    resetDiscoverSession: import("@reduxjs/toolkit").AsyncThunk<void, {
        updatedDiscoverSession?: import("../../../../../../saved_search/common").DiscoverSession;
        nextSelectedTabId?: string;
    } | undefined, {
        state: import("./types").DiscoverInternalState;
        dispatch: import("./internal_state").InternalStateDispatch;
        extra: import("./internal_state").InternalStateDependencies;
        rejectValue?: unknown;
        serializedErrorType?: unknown;
        pendingMeta?: unknown;
        fulfilledMeta?: unknown;
        rejectedMeta?: unknown;
    }>;
    setAppState: import("./internal_state").InternalStateThunkActionCreator<[{
        tabId: string;
    } & actions.RawAppStatePayload]>;
    syncProfileStateSnapshot: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        appState?: import("./types").DiscoverAppState;
    }>]>;
    updateAppState: import("./internal_state").InternalStateThunkActionCreator<[{
        tabId: string;
    } & actions.RawAppStatePayload]>;
    updateAppStateAndReplaceUrl: import("./internal_state").InternalStateThunkActionCreator<[{
        tabId: string;
    } & actions.RawAppStatePayload], Promise<void>>;
    updateGlobalState: import("./internal_state").InternalStateThunkActionCreator<[{
        tabId: string;
    } & Pick<import("./types").TabState, "globalState">]>;
    updateAttributes: import("./internal_state").InternalStateThunkActionCreator<[{
        tabId: string;
    } & {
        attributes: Partial<import("./types").TabState["attributes"]>;
    }]>;
    updateGlobalStateAndReplaceUrl: import("./internal_state").InternalStateThunkActionCreator<[{
        tabId: string;
    } & Pick<import("./types").TabState, "globalState">], Promise<void>>;
    pushCurrentTabStateToUrl: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload], Promise<void>>;
    transitionFromESQLToDataView: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        dataViewId: string;
    }>]>;
    transitionFromDataViewToESQL: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        dataView: import("@kbn/kql/server/data_views").DataView;
    }>]>;
    updateESQLQuery: import("./internal_state").InternalStateThunkActionCreator<[import("./types").UpdateESQLQueryActionPayload]>;
    onQuerySubmit: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        payload: {
            dateRange: import("@kbn/es-query").TimeRange;
            query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
        };
        isUpdate?: boolean;
    }>]>;
    fetchData: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        initial?: boolean;
    }>]>;
    pauseAutoRefreshInterval: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        dataView: import("@kbn/kql/server/data_views").DataView;
    }>]>;
    setDataView: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        dataView: import("@kbn/kql/server/data_views").DataView;
    }>]>;
    assignNextDataView: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        dataView: import("@kbn/kql/server/data_views").DataView;
    }>]>;
    changeDataView: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        dataViewOrDataViewId: string | import("@kbn/kql/server/data_views").DataView;
    }>], Promise<void>>;
    onDataViewCreated: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        nextDataView: import("@kbn/kql/server/data_views").DataView;
    }>], Promise<void>>;
    onDataViewEdited: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        editedDataView: import("@kbn/kql/server/data_views").DataView;
    }>], Promise<void>>;
    updateAdHocDataViewId: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        editedDataView: import("@kbn/kql/server/data_views").DataView;
    }>], Promise<import("@kbn/kql/server/data_views").DataView | undefined>>;
    createAndAppendAdHocDataView: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        dataViewSpec: import("../../../../../../data_views/common").DataViewSpec;
    }>], Promise<import("@kbn/kql/server/data_views").DataView>>;
    initializeAndSync: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload]>;
    stopSyncing: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload]>;
    setRenderDocumentViewMeta: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "renderDocumentViewMeta">>, "internalState/setRenderDocumentViewMeta">;
    setExpandedDoc: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        expandedDoc: import("@kbn/discover-utils").DataTableRecord | undefined;
        expandedDocOwner?: string;
        initialDocViewerTabId?: string;
        initialDocViewerTabState?: object;
    }>, "internalState/setExpandedDoc">;
    setGlobalState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "globalState">>, "internalState/setGlobalState">;
    setUnsavedChanges: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./selectors").HasUnsavedChangesResult, "internalState/setUnsavedChanges">;
    setInitializationState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        hasESData: boolean;
        hasUserDataView: boolean;
    }, "internalState/setInitializationState">;
    setForceFetchOnSelect: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "forceFetchOnSelect">>, "internalState/setForceFetchOnSelect">;
    setIsDataViewLoading: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "isDataViewLoading">>, "internalState/setIsDataViewLoading">;
    setDefaultProfileEsqlQuery: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<import("../../../../context_awareness").DefaultEsqlQueryConfig | undefined, "internalState/setDefaultProfileEsqlQuery">;
    setTabsBarVisibility: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./types").TabsBarVisibility, "internalState/setTabsBarVisibility">;
    markNonActiveTabsForRefetch: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"internalState/markNonActiveTabsForRefetch">;
    setInitialDocViewerTabId: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        initialDocViewerTabId: string | undefined;
    }>, "internalState/setInitialDocViewerTabId">;
    setDataRequestParams: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "dataRequestParams">>, "internalState/setDataRequestParams">;
    resetAppState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "appState">>, "internalState/resetAppState">;
    setAttributes: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "attributes">>, "internalState/setAttributes">;
    setOverriddenVisContextAfterInvalidation: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "overriddenVisContextAfterInvalidation">>, "internalState/setOverriddenVisContextAfterInvalidation">;
    setCascadedDocumentsState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "cascadedDocumentsState">>, "internalState/setCascadedDocumentsState">;
    setSelectedCascadeGroups: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").CascadedDocumentsState, "selectedCascadeGroups">>, "internalState/setSelectedCascadeGroups">;
    setEsqlVariables: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        esqlVariables: import("@kbn/esql-types").ESQLControlVariable[] | undefined;
    }>, "internalState/setEsqlVariables">;
    setIsESQLToDataViewTransitionModalVisible: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "internalState/setIsESQLToDataViewTransitionModalVisible">;
    setProfileStateFieldsToReset: import("@reduxjs/toolkit").ActionCreatorWithPreparedPayload<[payload: import("./internal_state").TabActionPayload<Pick<import("./types").DefaultProfileState, "fieldsToReset">>], {
        fieldsToReset: {
            fieldsToReset: import("./types").DefaultProfileStateFields;
            resetId: string;
        };
        tabId: string;
    }, "internalState/setProfileStateFieldsToReset", never, never>;
    setProfileStateFieldsToResetWithoutResetId: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").DefaultProfileState, "fieldsToReset">>, "internalState/setProfileStateFieldsToResetWithoutResetId">;
    resetOnSavedSearchChange: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<object>, "internalState/resetOnSavedSearchChange">;
    setESQLEditorUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        esqlEditorUiState: Partial<import("./types").TabState["uiState"]["esqlEditor"]>;
    }>, "internalState/setESQLEditorUiState">;
    setDataGridUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        dataGridUiState: Partial<import("./types").TabState["uiState"]["dataGrid"]>;
    }>, "internalState/setDataGridUiState">;
    setFieldListUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        fieldListUiState: Partial<import("./types").TabState["uiState"]["fieldList"]>;
    }>, "internalState/setFieldListUiState">;
    setFieldListExistingFieldsInfoUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        fieldListExistingFieldsInfo: import("./types").TabState["uiState"]["fieldListExistingFieldsInfo"];
    }>, "internalState/setFieldListExistingFieldsInfoUiState">;
    resetAffectedFieldListExistingFieldsInfoUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
        dataViewId: string;
    }, "internalState/resetAffectedFieldListExistingFieldsInfoUiState">;
    setLayoutUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        layoutUiState: Partial<import("./types").TabState["uiState"]["layout"]>;
    }>, "internalState/setLayoutUiState">;
    setSearchDraftUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        searchDraftUiState: Partial<import("./types").TabState["uiState"]["searchDraft"]>;
    }>, "internalState/setSearchDraftUiState">;
    setMetricsGridState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        metricsGridState: Partial<import("./types").TabState["uiState"]["metricsGrid"]>;
    }>, "internalState/setMetricsGridState">;
    setDocViewerUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        docViewerUiState: Partial<import("./types").TabState["uiState"]["docViewer"]>;
    }>, "internalState/setDocViewerUiState">;
    setDataCascadeUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        dataCascadeUiState: import("./types").TabState["uiState"]["dataCascade"];
    }>, "internalState/setDataCascadeUiState">;
    setCascadedDocumentsDataGridUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        nodeId: string;
        dataGridUiState: Partial<import("@kbn/unified-data-table").UnifiedDataTableRestorableState>;
    }>, "internalState/setCascadedDocumentsDataGridUiState">;
};
export { InternalStateProvider, useInternalStateDispatch, useInternalStateGetState, useInternalStateSubscribe, useInternalStateSelector, CurrentTabProvider, useCurrentTabSelector, useAppStateSelector, useCurrentTabAction, useCurrentChartPortalNode, useDataViewsForPicker, } from './hooks';
export { selectAllTabs, selectRecentlyClosedTabs, selectPersistedDiscoverSession, selectSavedDataViews, selectTab, selectTabAppState, selectTabCombinedFilters, selectIsTabsBarHidden, selectHasUnsavedChanges, searchSourceComparator, selectTabSavedSearch, selectTabSavedSearchByValueAttributes, } from './selectors';
export { type RuntimeStateManager, type ReactiveTabRuntimeState, type CombinedRuntimeState, type InitialUnifiedHistogramLayoutProps, DEFAULT_HISTOGRAM_KEY_PREFIX, createRuntimeStateManager, useRuntimeState, selectTabRuntimeState, selectDataSourceProfileId, selectIsDataViewUsedInMultipleRuntimeTabStates, selectInitialUnifiedHistogramLayoutPropsMap, useCurrentTabRuntimeState, useCurrentTabDataStateContainer, RuntimeStateProvider, RuntimeStateManagerProvider, useRuntimeStateManager, useCurrentDataView, useAdHocDataViews, } from './runtime_state';
export { type TabActionInjector, createTabActionInjector, createTabItem, getSerializedSearchSourceDataViewDetails, parseControlGroupJson, extractEsqlVariables, } from './utils';
export { fromSavedObjectTabToSearchSource, fromSavedObjectTabToTabState, fromSavedObjectTabToSavedSearch, fromTabStateToSavedObjectTab, fromSavedSearchToSavedObjectTab, } from './tab_mapping_utils';
