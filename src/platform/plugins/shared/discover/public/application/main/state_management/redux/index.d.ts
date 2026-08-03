import { internalStateSlice } from './internal_state';
import * as actions from './actions';
export { type DiscoverInternalState, type TabState, type TabStateGlobalState, type RecentlyClosedTabState, type DiscoverAppState, type InternalStateDataRequestParams, type CascadedDocumentsState, type DefaultProfileStateField, type DefaultProfileStateFields, type DefaultProfileState, type ProfileStateSnapshot, type UpdateESQLQueryActionPayload, DEFAULT_PROFILE_STATE_FIELDS, TabInitializationStatus, TabsBarVisibility, } from './types';
export { DEFAULT_EXPANDED_DOC_OWNER, DEFAULT_TAB_STATE } from './constants';
export { type InternalStateStore, type InternalStateDispatch, type InternalStateDependencies, createInternalStateStore, } from './internal_state';
export declare const internalStateActions: {
    syncLocallyPersistedTabState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<object>, string>;
    loadDataViewList: import("redux-toolkit-v1").AsyncThunk<import("../../../../../../data_views/common").DataViewListItem[], void, {
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
    updateAdHocDataViews: import("./internal_state").InternalStateThunkActionCreator<[import("@kbn/kql/server/data_views").DataView[]], Promise<void>>;
    setDefaultProfileAdHocDataViews: import("./internal_state").InternalStateThunkActionCreator<[import("@kbn/kql/server/data_views").DataView[]]>;
    appendAdHocDataViews: import("./internal_state").InternalStateThunkActionCreator<[import("@kbn/kql/server/data_views").DataView | import("@kbn/kql/server/data_views").DataView[]]>;
    replaceAdHocDataViewWithId: import("./internal_state").InternalStateThunkActionCreator<[string, import("@kbn/kql/server/data_views").DataView]>;
    initializeSingleTab: import("redux-toolkit-v1").AsyncThunk<{
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
    initializeTabs: import("redux-toolkit-v1").AsyncThunk<{
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
        profileState?: import("../../../../../common/context_awareness").ProfileStateMap;
    }], Promise<void>>;
    openInNewTabExtPointAction: import("./internal_state").InternalStateThunkActionCreator<[import("../../../../context_awareness").OpenInNewTabParams], Promise<void>>;
    openSearchSessionInNewTab: import("./internal_state").InternalStateThunkActionCreator<[{
        searchSession: import("../../../../../../data/public/search/session/sessions_mgmt/types").UISession;
    }], Promise<void>>;
    clearRecentlyClosedTabs: import("./internal_state").InternalStateThunkActionCreator;
    disconnectTab: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload]>;
    openDiscoverSession: import("redux-toolkit-v1").AsyncThunk<void, {
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
    saveDiscoverSession: import("redux-toolkit-v1").AsyncThunk<{
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
    resetDiscoverSession: import("redux-toolkit-v1").AsyncThunk<void, {
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
    updateGlobalStateAndReplaceUrl: import("./internal_state").InternalStateThunkActionCreator<[{
        tabId: string;
    } & Pick<import("./types").TabState, "globalState">], Promise<void>>;
    updateAttributes: import("./internal_state").InternalStateThunkActionCreator<[{
        tabId: string;
    } & {
        attributes: Partial<import("./types").TabState["attributes"]>;
    }]>;
    setProfileState: <TState extends import("@kbn/utility-types").SerializableRecord>(payload: {
        tabId: string;
    } & {
        profileStateDefinition: import("../../../../../common/context_awareness").ProfileStateDefinition<TState>;
        profileState: TState;
        historyMethod?: import("../../../../context_awareness").ProfileStateMutationOptions["historyMethod"];
    }) => import("./internal_state").InternalStateThunkAction;
    pushCurrentTabStateToUrl: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload], Promise<void>>;
    transitionFromESQLToDataView: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        dataView: import("@kbn/kql/server/data_views").DataView;
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
    addFilter: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload<{
        field: Parameters<import("@kbn/unified-doc-viewer/types").DocViewFilterFn>[0];
        value: Parameters<import("@kbn/unified-doc-viewer/types").DocViewFilterFn>[1];
        mode: Parameters<import("@kbn/unified-doc-viewer/types").DocViewFilterFn>[2];
    }>]>;
    initializeAndSync: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload]>;
    stopSyncing: import("./internal_state").InternalStateThunkActionCreator<[import("./internal_state").TabActionPayload]>;
    setRenderDocumentViewMeta: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "renderDocumentViewMeta">>, "internalState/setRenderDocumentViewMeta">;
    setExpandedDoc: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        expandedDoc: import("@kbn/discover-utils").DataTableRecord | undefined;
        expandedDocOwner?: string;
        initialDocViewerTabId?: string;
        initialDocViewerTabState?: object;
    }>, "internalState/setExpandedDoc">;
    setUnsavedChanges: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./selectors").HasUnsavedChangesResult, "internalState/setUnsavedChanges">;
    setGlobalState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "globalState">>, "internalState/setGlobalState">;
    setInitializationState: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        hasESData: boolean;
        hasUserDataView: boolean;
    }, "internalState/setInitializationState">;
    setForceFetchOnSelect: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "forceFetchOnSelect">>, "internalState/setForceFetchOnSelect">;
    setIsDataViewLoading: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "isDataViewLoading">>, "internalState/setIsDataViewLoading">;
    setDefaultProfileEsqlQuery: import("redux-toolkit-v1").ActionCreatorWithOptionalPayload<import("../../../../context_awareness").DefaultEsqlQueryConfig | undefined, "internalState/setDefaultProfileEsqlQuery">;
    setTabsBarVisibility: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./types").TabsBarVisibility, "internalState/setTabsBarVisibility">;
    markNonActiveTabsForRefetch: import("redux-toolkit-v1").ActionCreatorWithoutPayload<"internalState/markNonActiveTabsForRefetch">;
    setInitialDocViewerTabId: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        initialDocViewerTabId: string | undefined;
    }>, "internalState/setInitialDocViewerTabId">;
    setDataRequestParams: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "dataRequestParams">>, "internalState/setDataRequestParams">;
    initializeTabState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        initialAppState: import("./types").TabState["appState"];
        initialProfileState: import("./types").TabState["profileState"];
    }>, "internalState/initializeTabState">;
    setAttributes: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "attributes">>, "internalState/setAttributes">;
    setOverriddenVisContextAfterInvalidation: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "overriddenVisContextAfterInvalidation">>, "internalState/setOverriddenVisContextAfterInvalidation">;
    setCascadedDocumentsState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").TabState, "cascadedDocumentsState">>, "internalState/setCascadedDocumentsState">;
    setSelectedCascadeGroups: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<Pick<import("./types").CascadedDocumentsState, "selectedCascadeGroups">>, "internalState/setSelectedCascadeGroups">;
    setEsqlVariables: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        esqlVariables: import("@kbn/esql-types").ESQLControlVariable[] | undefined;
    }>, "internalState/setEsqlVariables">;
    setIsESQLToDataViewTransitionModalVisible: import("redux-toolkit-v1").ActionCreatorWithPayload<boolean, "internalState/setIsESQLToDataViewTransitionModalVisible">;
    setProfileStateFieldsToReset: import("redux-toolkit-v1").ActionCreatorWithPreparedPayload<[payload: import("./internal_state").TabActionPayload<Pick<import("./types").DefaultProfileState, "fieldsToReset">>], {
        fieldsToReset: {
            fieldsToReset: import("./types").DefaultProfileStateFields;
            resetId: string;
        };
        tabId: string;
    }, "internalState/setProfileStateFieldsToReset", never, never>;
    resetOnSavedSearchChange: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<object>, "internalState/resetOnSavedSearchChange">;
    setESQLEditorUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        esqlEditorUiState: Partial<import("./types").TabState["uiState"]["esqlEditor"]>;
    }>, "internalState/setESQLEditorUiState">;
    setDataGridUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        dataGridUiState: Partial<import("./types").TabState["uiState"]["dataGrid"]>;
    }>, "internalState/setDataGridUiState">;
    setFieldListUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        fieldListUiState: Partial<import("./types").TabState["uiState"]["fieldList"]>;
    }>, "internalState/setFieldListUiState">;
    setFieldListExistingFieldsInfoUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        fieldListExistingFieldsInfo: import("./types").TabState["uiState"]["fieldListExistingFieldsInfo"];
    }>, "internalState/setFieldListExistingFieldsInfoUiState">;
    resetAffectedFieldListExistingFieldsInfoUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<{
        dataViewId: string;
    }, "internalState/resetAffectedFieldListExistingFieldsInfoUiState">;
    setLayoutUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        layoutUiState: Partial<import("./types").TabState["uiState"]["layout"]>;
    }>, "internalState/setLayoutUiState">;
    setSearchDraftUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        searchDraftUiState: Partial<import("./types").TabState["uiState"]["searchDraft"]>;
    }>, "internalState/setSearchDraftUiState">;
    setMetricsGridState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        metricsGridState: Partial<import("./types").TabState["uiState"]["metricsGrid"]>;
    }>, "internalState/setMetricsGridState">;
    setDocViewerUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        docViewerUiState: Partial<import("./types").TabState["uiState"]["docViewer"]>;
    }>, "internalState/setDocViewerUiState">;
    setDataCascadeUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        dataCascadeUiState: import("./types").TabState["uiState"]["dataCascade"];
    }>, "internalState/setDataCascadeUiState">;
    setCascadedDocumentsDataGridUiState: import("redux-toolkit-v1").ActionCreatorWithPayload<import("./internal_state").TabActionPayload<{
        nodeId: string;
        dataGridUiState: Partial<import("@kbn/unified-data-table").UnifiedDataTableRestorableState>;
    }>, "internalState/setCascadedDocumentsDataGridUiState">;
};
export { InternalStateProvider, useInternalStateDispatch, useInternalStateGetState, useInternalStateSubscribe, useInternalStateSelector, CurrentTabProvider, useCurrentTabSelector, useAppStateSelector, useCurrentTabAction, useCurrentChartPortalNode, useDataViewsForPicker, } from './hooks';
export { selectAllTabs, selectRecentlyClosedTabs, selectPersistedDiscoverSession, selectSavedDataViews, selectTab, selectTabAppState, selectTabCombinedFilters, selectIsTabsBarHidden, selectHasUnsavedChanges, searchSourceComparator, selectTabSavedSearch, selectTabSavedSearchByValueAttributes, } from './selectors';
export { type RuntimeStateManager, type ReactiveTabRuntimeState, type CombinedRuntimeState, type InitialUnifiedHistogramLayoutProps, DEFAULT_HISTOGRAM_KEY_PREFIX, createRuntimeStateManager, useRuntimeState, selectTabRuntimeState, selectDataSourceProfileId, selectCurrentProfileStateDefinition, selectCurrentProfileUrlState, selectCurrentProfileLocatorState, selectIsDataViewUsedInMultipleRuntimeTabStates, selectInitialUnifiedHistogramLayoutPropsMap, useCurrentTabRuntimeState, useCurrentTabDataStateContainer, RuntimeStateProvider, RuntimeStateManagerProvider, useRuntimeStateManager, useCurrentDataView, useAdHocDataViews, } from './runtime_state';
export { type TabActionInjector, createTabActionInjector, createTabItem, getSerializedSearchSourceDataViewDetails, parseControlGroupJson, extractEsqlVariables, } from './utils';
export { fromSavedObjectTabToSearchSource, fromSavedObjectTabToAppState, fromSavedObjectTabToTabState, fromSavedObjectTabToSavedSearch, fromTabStateToSavedObjectTab, fromSavedSearchToSavedObjectTab, } from './tab_mapping_utils';
