/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { EsqlSource } from '@kbn/data-source';
import { isEmptyEsqlQuery, isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { cloneDeep, isEqual, pick } from 'lodash';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { internalStateSlice, type TabActionPayload } from '../internal_state';
import {
  getConfiguredDefaultEsqlQuery,
  getDefaultQuery,
  getInitialAppState,
} from '../../utils/get_initial_app_state';
import { TabInitializationStatus, type DiscoverAppState } from '..';
import type { DiscoverDataStateContainer } from '../../discover_data_state_container';
import { appendAdHocDataViews, loadDataViewListOnce } from './data_views';
import { loadDataViewAvailabilityOnce, loadESDataAvailabilityOnce } from './data_availability';
import { setDataSource, setDataView } from './tab_state_data_view';
import { type AppStateUrl, cleanupUrlState } from '../../utils/cleanup_url_state';
import { getInitialDataViewTarget, loadAndResolveDataView } from '../../utils/resolve_data_view';
import { isRefreshIntervalValid, isTimeRangeValid } from '../../../../../utils/validate_time';
import { getValidFilters } from '../../../../../utils/get_valid_filters';
import { APP_STATE_URL_KEY } from '../../../../../../common';
import { selectTabRuntimeState } from '../runtime_state';
import type { ConnectedCustomizationService } from '../../../../../customizations';
import { ProfileStateType, type ProfileStateMap } from '../../../../../../common/context_awareness';
import { selectTab } from '../selectors';
import type { TabState, TabStateGlobalState } from '../types';
import { GLOBAL_STATE_URL_KEY, PROFILE_STATE_URL_KEY } from '../../../../../../common/constants';
import { fromSavedObjectTabToSearchSource } from '../tab_mapping_utils';
import { createInternalStateAsyncThunk, extractEsqlVariables } from '../utils';
import { isNonEmptyEsqlQuery } from '../../utils/is_non_empty_esql_query';
import { fetchData, updateAttributes } from './tab_state';
import { initializeAndSync } from './tab_sync';
import { resolveEsqlSource } from '../../../data_fetching/resolve_esql_source';

export interface InitializeSingleTabsParams {
  customizationService: ConnectedCustomizationService;
  dataStateContainer: DiscoverDataStateContainer;
  dataViewSpec: DataViewSpec | undefined;
  esqlControls: ControlPanelsState<OptionsListESQLControlState> | undefined;
  defaultUrlState: DiscoverAppState | undefined;
  profileState?: ProfileStateMap;
}

export const initializeSingleTab = createInternalStateAsyncThunk(
  'internalState/initializeSingleTab',
  async function initializeSingleTabThunkFn(
    {
      tabId,
      initializeSingleTabParams: {
        customizationService,
        dataStateContainer,
        dataViewSpec,
        esqlControls,
        defaultUrlState,
        profileState,
      },
    }: TabActionPayload<{ initializeSingleTabParams: InitializeSingleTabsParams }>,
    {
      dispatch,
      getState,
      extra: { services, runtimeStateManager, urlStateStorage, searchSessionManager },
    }
  ) {
    const { dataStateContainer$, customizationService$, scopedEbtManager$ } = selectTabRuntimeState(
      runtimeStateManager,
      tabId
    );

    /**
     * New tab initialization with the restored data if available
     */

    let tabInitialGlobalState: TabStateGlobalState | undefined;
    let tabInitialAppState: DiscoverAppState | undefined;
    let tabInitialInternalState: TabState['initialInternalState'] | undefined;

    const getTabState = () => selectTab(getState(), tabId);
    const tabState = getTabState();

    if (tabState.globalState) {
      tabInitialGlobalState = cloneDeep(tabState.globalState);
    }

    if (tabState.appState) {
      tabInitialAppState = cloneDeep(tabState.appState);
    }

    if (tabState.initialInternalState) {
      tabInitialInternalState = cloneDeep(tabState.initialInternalState);
    }

    const controlGroupState = esqlControls ?? tabState.attributes.controlGroupState;
    const initialEsqlVariables = extractEsqlVariables(controlGroupState ?? null);

    if (esqlControls) {
      dispatch(
        updateAttributes({
          tabId,
          attributes: {
            controlGroupState: esqlControls,
          },
        })
      );
    }

    if (initialEsqlVariables.length) {
      dispatch(
        internalStateSlice.actions.setEsqlVariables({
          tabId,
          esqlVariables: initialEsqlVariables,
        })
      );
    }

    // Get a snapshot of the current URL state before any async work is done
    // to avoid race conditions if the URL changes during tab initialization,
    // e.g. if the user quickly switches tabs
    const urlGlobalState = urlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_URL_KEY);
    const urlAppState = {
      ...tabInitialAppState,
      ...(defaultUrlState ??
        cleanupUrlState(urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY), services.uiSettings)),
    };
    const urlProfileState = services.profileStateRegistry.pickStateByType({
      profileStateMap: urlStateStorage.get<ProfileStateMap>(PROFILE_STATE_URL_KEY) ?? undefined,
      stateTypes: [ProfileStateType.Url],
    });
    const defaultPersistentProfileState = services.profileStateRegistry.pickStateByType({
      profileStateMap: profileState,
      stateTypes: [ProfileStateType.Persistent],
    });

    const discoverTabLoadTracker = scopedEbtManager$
      .getValue()
      .trackPerformanceEvent('discoverLoadSavedSearch');

    const { persistedDiscoverSession, defaultProfileEsqlQuery } = getState();
    const persistedTab = persistedDiscoverSession?.tabs.find((tab) => tab.id === tabId);
    const persistedTabSearchSource = persistedTab
      ? await fromSavedObjectTabToSearchSource({ tab: persistedTab, services })
      : undefined;

    const hasGlobalState = Object.keys(urlGlobalState || {}).length > 0;
    const locationStateHasDataViewSpec = Boolean(dataViewSpec);
    const restoredQuery = urlAppState?.query ?? persistedTab?.serializedSearchSource.query;
    const configuredEsqlQuery = getConfiguredDefaultEsqlQuery({
      initialUrlState: urlAppState,
      hasGlobalState,
      persistedTab,
      services,
      defaultProfileEsqlQuery,
      locationStateHasDataViewSpec,
    });

    const resolveOpeningEsqlSource = (esql: string) =>
      resolveEsqlSource({
        esql,
        services,
        esqlVariables: initialEsqlVariables,
        timeRange:
          urlGlobalState?.time ??
          tabInitialGlobalState?.timeRange ??
          services.data.query.timefilter.timefilter.getTime(),
      });

    let openingQuery = restoredQuery ?? configuredEsqlQuery;
    let dataView: DataView;
    let esqlSource: EsqlSource | undefined;

    if (isNonEmptyEsqlQuery(openingQuery)) {
      ({ dataView, esqlSource } = await resolveOpeningEsqlSource(openingQuery.esql));
    } else {
      // Without an ES|QL query, a data view is needed to open the tab or derive its default query.
      const isEsqlMode = isOfAggregateQueryType(openingQuery);
      const currentDataView = persistedTabSearchSource?.getField('index');
      const { dataViewId, initialAdHocDataViewSpec } = getInitialDataViewTarget({
        dataSource: urlAppState?.dataSource,
        initialDataViewIdOrSpec: tabInitialInternalState?.serializedSearchSource?.index,
        currentDataView,
      });
      const hasDataView = await dispatch(loadDataViewAvailabilityOnce());

      if (!hasDataView) {
        const hasESData = await dispatch(loadESDataAvailabilityOnce());

        if (!hasESData) {
          return { showNoDataPage: true };
        }

        // Without persisted data views, the tab can still open an ad hoc data view it was given.
        const { defaultProfileAdHocDataViewIds } = getState();
        const hasInitialAdHocDataView = dataViewId && initialAdHocDataViewSpec?.id === dataViewId;
        const hasCurrentAdHocDataView = currentDataView?.isPersisted() === false;
        const hasProfileDataView = runtimeStateManager.adHocDataViews$
          .getValue()
          .some(({ id }) => id && defaultProfileAdHocDataViewIds.includes(id));
        const canOpenWithoutDataViews =
          isEsqlMode ||
          locationStateHasDataViewSpec ||
          hasInitialAdHocDataView ||
          hasCurrentAdHocDataView ||
          hasProfileDataView;

        if (!canOpenWithoutDataViews) {
          return { showNoDataPage: true };
        }
      }

      await dispatch(loadDataViewListOnce());

      ({ dataView } = await loadAndResolveDataView({
        dataViewId,
        locationDataViewSpec: dataViewSpec,
        initialAdHocDataViewSpec,
        currentDataView,
        isEsqlMode,
        services,
        savedDataViews: getState().savedDataViews,
        runtimeStateManager,
      }));

      openingQuery ??= getDefaultQuery({
        initialUrlState: urlAppState,
        hasGlobalState,
        persistedTab,
        services,
        dataView,
        defaultProfileEsqlQuery,
        locationStateHasDataViewSpec,
      });

      // A new tab can derive an ES|QL query from the data view.
      if (isNonEmptyEsqlQuery(openingQuery)) {
        ({ dataView, esqlSource } = await resolveOpeningEsqlSource(openingQuery.esql));
      }
    }

    const readsIndex = esqlSource && Boolean(getIndexPatternFromESQLQuery(esqlSource.query));
    const needsEsqlAvailabilityCheck =
      esqlSource && (!esqlSource.areColumnsAvailable || !readsIndex);

    if (needsEsqlAvailabilityCheck) {
      const esDataRequest = dispatch(loadESDataAvailabilityOnce());
      const dataViewRequest = dispatch(loadDataViewAvailabilityOnce());
      const availabilityRequests = [esDataRequest, dataViewRequest];

      // Either positive result allows opening; onboarding requires both checks to finish negative.
      const firstAvailabilityResult = await Promise.race(availabilityRequests);

      if (!firstAvailabilityResult) {
        const [hasESData, hasDataView] = await Promise.all(availabilityRequests);

        if (!hasESData && !hasDataView) {
          return { showNoDataPage: true };
        }
      }
    }

    if (!esqlSource && !dataView.isPersisted()) {
      dispatch(appendAdHocDataViews(dataView));
    }

    // Get the initial app state based on a combo of the URL and persisted tab saved search
    const initialAppState = getInitialAppState({
      initialUrlState: urlAppState,
      hasGlobalState,
      persistedTab,
      dataView,
      services,
      defaultProfileEsqlQuery,
      query: openingQuery,
    });

    const initialGlobalState: TabStateGlobalState = {
      ...(persistedTab?.timeRestore && (esqlSource?.isTimeBased() ?? dataView.isTimeBased())
        ? pick(persistedTab, 'timeRange', 'refreshInterval')
        : undefined),
      ...tabInitialGlobalState,
    };

    if (urlGlobalState?.time) {
      initialGlobalState.timeRange = urlGlobalState.time;
    }

    if (urlGlobalState?.refreshInterval) {
      initialGlobalState.refreshInterval = urlGlobalState.refreshInterval;
    }

    if (urlGlobalState?.filters) {
      initialGlobalState.filters = urlGlobalState.filters;
    }

    dispatch(
      esqlSource
        ? setDataSource({ tabId, dataSource: esqlSource })
        : setDataView({ tabId, dataView })
    );

    /**
     * Sync global services
     */

    // Use a function to check if the current tab is still active
    // to ensure we are always checking the latest state
    const isCurrentTabActive = () => {
      const isTabSelected = getState().tabs.unsafeCurrentId === tabId;
      const currentTabState = getTabState() as TabState | undefined;
      const isTabDisconnected =
        currentTabState?.initializationState.initializationStatus ===
        TabInitializationStatus.Disconnected;
      return isTabSelected && Boolean(currentTabState) && !isTabDisconnected;
    };

    // Only update global services if this is still the current tab
    if (isCurrentTabActive()) {
      // Push the tab's initial search session ID to the URL if one exists,
      // unless it should be overridden by a search session ID already in the URL
      if (
        tabInitialInternalState?.searchSessionId &&
        !searchSessionManager.hasSearchSessionIdInURL()
      ) {
        searchSessionManager.pushSearchSessionIdToURL(tabInitialInternalState.searchSessionId, {
          replace: true,
        });
      }

      // Cleaning up the previous state
      services.filterManager.setAppFilters([]);
      services.data.query.queryString.clearQuery();

      if (initialGlobalState.timeRange && isTimeRangeValid(initialGlobalState.timeRange)) {
        services.timefilter.setTime(initialGlobalState.timeRange);
      }

      if (
        initialGlobalState.refreshInterval &&
        isRefreshIntervalValid(initialGlobalState.refreshInterval)
      ) {
        services.timefilter.setRefreshInterval(initialGlobalState.refreshInterval);
      }

      if (initialGlobalState.filters) {
        services.filterManager.setGlobalFilters(cloneDeep(initialGlobalState.filters));
      }

      if (initialAppState.filters) {
        services.filterManager.setAppFilters(cloneDeep(initialAppState.filters));
      }

      // some filters may not be valid for this context, so update
      // the filter manager with a modified list of valid filters
      const currentFilters = services.filterManager.getFilters();
      const validFilters = getValidFilters(dataView, currentFilters);
      if (!isEqual(currentFilters, validFilters)) {
        services.filterManager.setFilters(validFilters);
      }

      if (initialAppState.query) {
        services.data.query.queryString.setQuery(initialAppState.query);
      }
    }

    /**
     * Update state containers
     */

    // Initialize app and profile state together
    const mergedProfileState = services.profileStateRegistry.mergeState(
      tabState.profileState,
      defaultPersistentProfileState,
      urlProfileState
    );
    const initialProfileState = services.profileStateRegistry.pickStateByType({
      profileStateMap: mergedProfileState,
      stateTypes: [ProfileStateType.Ui, ProfileStateType.Persistent, ProfileStateType.Url],
      defaultsHandling: 'strip',
    });

    dispatch(
      internalStateSlice.actions.initializeTabState({
        tabId,
        initialAppState,
        initialProfileState,
      })
    );

    // Set runtime state
    customizationService$.next(customizationService);
    dataStateContainer$.next(dataStateContainer);

    // Begin syncing the state and trigger the initial fetch
    // if this is still the current tab, otherwise mark the
    // tab to fetch when selected

    // Skip the initial fetch for fresh "+" tabs and empty ES|QL queries.
    // skipInitialFetch is in-memory only and is lost on refresh. Empty ES|QL is
    // the persisted signal — restore the flag so a later switch to classic does
    // not treat the tab as search-on-page-load and get stuck in LOADING.
    const shouldSkipInitialFetch =
      tabState.skipInitialFetch || isEmptyEsqlQuery(initialAppState.query);

    if (shouldSkipInitialFetch && !tabState.skipInitialFetch) {
      dispatch(
        internalStateSlice.actions.setSkipInitialFetch({
          tabId,
          skipInitialFetch: true,
        })
      );
    }

    if (isCurrentTabActive()) {
      dispatch(initializeAndSync({ tabId }));

      if (!shouldSkipInitialFetch) {
        dispatch(fetchData({ tabId, initial: true }));
      }
    } else {
      dispatch(
        internalStateSlice.actions.setForceFetchOnSelect({
          tabId,
          forceFetchOnSelect: !shouldSkipInitialFetch,
        })
      );
    }

    discoverTabLoadTracker.reportEvent();

    return { showNoDataPage: false };
  }
);
