/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, differenceBy, omit } from 'lodash';
import type { QueryState } from '@kbn/data-plugin/common';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getInitialESQLQuery } from '@kbn/esql-utils';
import type { TabItem } from '@kbn/unified-tabs';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { createDataSource } from '../../../../../../common/data_sources/utils';
import { type TabState } from '../types';
import { selectAllTabs, selectRecentlyClosedTabs, selectTab } from '../selectors';
import {
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import {
  createTabRuntimeState,
  selectTabRuntimeState,
  selectTabRuntimeAppState,
  selectInitialUnifiedHistogramLayoutPropsMap,
  selectTabRuntimeInternalState,
} from '../runtime_state';
import {
  APP_STATE_URL_KEY,
  GLOBAL_STATE_URL_KEY,
  NEW_TAB_ID,
} from '../../../../../../common/constants';
import type { DiscoverAppState } from '../../discover_app_state_container';
import { createInternalStateAsyncThunk, createTabItem } from '../utils';
import { setBreadcrumbs } from '../../../../../utils/breadcrumbs';
import { DEFAULT_TAB_STATE } from '../constants';

export const setTabs: InternalStateThunkActionCreator<
  [Parameters<typeof internalStateSlice.actions.setTabs>[0]]
> = (params) =>
  function setTabsThunkFn(
    dispatch,
    getState,
    { runtimeStateManager, tabsStorageManager, services: { profilesManager, ebtManager } }
  ) {
    const previousState = getState();
    const discoverSessionChanged =
      params.updatedDiscoverSession &&
      previousState.persistedDiscoverSession &&
      params.updatedDiscoverSession.id !== previousState.persistedDiscoverSession?.id;

    const previousTabs = selectAllTabs(previousState);
    const removedTabs = discoverSessionChanged
      ? previousTabs
      : differenceBy(previousTabs, params.allTabs, differenceIterateeByTabId);
    const addedTabs = discoverSessionChanged
      ? params.allTabs
      : differenceBy(params.allTabs, previousTabs, differenceIterateeByTabId);
    const justRemovedTabs: TabState[] = [];

    for (const tab of removedTabs) {
      const newRecentlyClosedTab: TabState = { ...tab };
      // make sure to get the latest internal and app state from runtime state manager before deleting the runtime state
      newRecentlyClosedTab.initialInternalState =
        selectTabRuntimeInternalState(runtimeStateManager, tab.id) ??
        cloneDeep(tab.initialInternalState);
      newRecentlyClosedTab.initialAppState =
        selectTabRuntimeAppState(runtimeStateManager, tab.id) ?? cloneDeep(tab.initialAppState);
      newRecentlyClosedTab.globalState = cloneDeep(tab.globalState);
      justRemovedTabs.push(newRecentlyClosedTab);

      dispatch(disconnectTab({ tabId: tab.id }));
      delete runtimeStateManager.tabs.byId[tab.id];
    }

    for (const tab of addedTabs) {
      runtimeStateManager.tabs.byId[tab.id] = createTabRuntimeState({
        profilesManager,
        ebtManager,
        initialValues: {
          unifiedHistogramLayoutPropsMap: tab.duplicatedFromId
            ? selectInitialUnifiedHistogramLayoutPropsMap(runtimeStateManager, tab.duplicatedFromId)
            : undefined,
        },
      });
    }

    const selectedTabRuntimeState = selectTabRuntimeState(
      runtimeStateManager,
      params.selectedTabId
    );

    if (selectedTabRuntimeState) {
      selectedTabRuntimeState.scopedEbtManager$.getValue().setAsActiveManager();
    }

    dispatch(
      internalStateSlice.actions.setTabs({
        ...params,
        recentlyClosedTabs: tabsStorageManager.getNRecentlyClosedTabs({
          previousOpenTabs: previousTabs,
          previousRecentlyClosedTabs: params.recentlyClosedTabs,
          nextOpenTabs: params.allTabs,
          justRemovedTabs,
        }),
      })
    );
  };

export const updateTabs: InternalStateThunkActionCreator<
  [
    {
      items: TabState[] | TabItem[];
      selectedItem: TabState | TabItem | null;
      updatedDiscoverSession?: DiscoverSession;
    },
    void
  ],
  Promise<void>
> = ({ items, selectedItem, updatedDiscoverSession }) =>
  async function updateTabsThunkFn(
    dispatch,
    getState,
    { services, runtimeStateManager, tabsStorageManager, urlStateStorage }
  ) {
    const currentState = getState();
    const currentTab = selectTab(currentState, currentState.tabs.unsafeCurrentId);
    const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTab.id);
    const currentTabStateContainer = currentTabRuntimeState.stateContainer$.getValue();

    const updatedTabs = items.map<TabState>((item) => {
      const existingTab = selectTab(currentState, item.id);

      const tab: TabState = {
        ...DEFAULT_TAB_STATE,
        ...{
          globalState: {
            timeRange: services.timefilter.getTime(),
            refreshInterval: services.timefilter.getRefreshInterval(),
            filters: services.filterManager.getGlobalFilters(),
          },
        },
        ...existingTab,
        ...item,
      };

      if (!existingTab) {
        // the following assignments for initialAppState, globalState, and dataRequestParams are for supporting `openInNewTab` action
        tab.initialAppState =
          'initialAppState' in item ? cloneDeep(item.initialAppState) : tab.initialAppState;
        tab.globalState = 'globalState' in item ? cloneDeep(item.globalState) : tab.globalState;
        tab.dataRequestParams =
          'dataRequestParams' in item ? item.dataRequestParams : tab.dataRequestParams;

        if (item.duplicatedFromId) {
          // the new tab was created by duplicating an existing tab
          const existingTabToDuplicateFrom = selectTab(currentState, item.duplicatedFromId);

          if (!existingTabToDuplicateFrom) {
            return tab;
          }

          tab.initialInternalState =
            selectTabRuntimeInternalState(runtimeStateManager, item.duplicatedFromId) ??
            cloneDeep(existingTabToDuplicateFrom.initialInternalState);
          tab.initialAppState =
            selectTabRuntimeAppState(runtimeStateManager, item.duplicatedFromId) ??
            cloneDeep(existingTabToDuplicateFrom.initialAppState);
          tab.globalState = cloneDeep(existingTabToDuplicateFrom.globalState);
          tab.uiState = cloneDeep(existingTabToDuplicateFrom.uiState);
        } else if (item.restoredFromId) {
          // the new tab was created by restoring a recently closed tab
          const recentlyClosedTabToRestore = selectRecentlyClosedTabs(currentState).find(
            (t) => t.id === item.restoredFromId
          );

          if (!recentlyClosedTabToRestore) {
            return tab;
          }

          tab.initialInternalState = cloneDeep(recentlyClosedTabToRestore.initialInternalState);
          tab.initialAppState = cloneDeep(recentlyClosedTabToRestore.initialAppState);
          tab.globalState = cloneDeep(recentlyClosedTabToRestore.globalState);
        } else if (!tab.initialAppState) {
          // the new tab is a fresh one
          const currentQuery = selectTabRuntimeAppState(runtimeStateManager, currentTab.id)?.query;
          const currentDataView = currentTabRuntimeState.currentDataView$.getValue();

          if (!currentQuery || !currentDataView) {
            return tab;
          }

          tab.initialAppState = {
            ...(isOfAggregateQueryType(currentQuery)
              ? { query: { esql: getInitialESQLQuery(currentDataView, true) } }
              : {}),
            dataSource: createDataSource({
              dataView: currentDataView,
              query: currentQuery,
            }),
          };
        }
      }

      return tab;
    });

    const selectedTab = selectedItem ?? currentTab;

    // Push the selected tab ID to the URL, which creates a new browser history entry.
    // This must be done before setting other URL state, which replace the history entry
    // in order to avoid creating multiple browser history entries when switching tabs.
    await tabsStorageManager.pushSelectedTabIdToUrl(selectedTab.id);

    if (selectedTab.id !== currentTab.id) {
      currentTabStateContainer?.actions.stopSyncing();

      const nextTab = updatedTabs.find((tab) => tab.id === selectedTab.id);
      const nextTabRuntimeState = selectTabRuntimeState(runtimeStateManager, selectedTab.id);
      const nextTabStateContainer = nextTabRuntimeState?.stateContainer$.getValue();

      if (nextTab && nextTabStateContainer) {
        const { timeRange, refreshInterval, filters: globalFilters } = nextTab.globalState;
        const appState = nextTabStateContainer.appState.getState();
        const { filters: appFilters, query } = appState;

        await urlStateStorage.set<QueryState>(
          GLOBAL_STATE_URL_KEY,
          {
            time: timeRange,
            refreshInterval,
            filters: globalFilters,
          },
          { replace: true }
        );
        await urlStateStorage.set<DiscoverAppState>(APP_STATE_URL_KEY, appState, { replace: true });

        services.timefilter.setTime(timeRange ?? services.timefilter.getTimeDefaults());
        services.timefilter.setRefreshInterval(
          refreshInterval ?? services.timefilter.getRefreshIntervalDefaults()
        );
        services.filterManager.setGlobalFilters(cloneDeep(globalFilters ?? []));
        services.filterManager.setAppFilters(cloneDeep(appFilters ?? []));
        services.data.query.queryString.setQuery(
          query ?? services.data.query.queryString.getDefaultQuery()
        );

        if (nextTab.dataRequestParams.searchSessionId) {
          services.data.search.session.continue(nextTab.dataRequestParams.searchSessionId, true);
        } else {
          services.data.search.session.start();
        }

        nextTabStateContainer.actions.initializeAndSync();

        if (nextTab.forceFetchOnSelect) {
          nextTabStateContainer.dataState.reset();
          nextTabStateContainer.actions.fetchData();
        }
      } else {
        await urlStateStorage.set(GLOBAL_STATE_URL_KEY, null, { replace: true });
        await urlStateStorage.set(APP_STATE_URL_KEY, null, { replace: true });
      }

      dispatch(internalStateSlice.actions.discardFlyoutsOnTabChange());
    }

    dispatch(
      setTabs({
        allTabs: updatedTabs,
        selectedTabId: selectedTab.id,
        recentlyClosedTabs: selectRecentlyClosedTabs(currentState),
        updatedDiscoverSession,
      })
    );
  };

export const initializeTabs = createInternalStateAsyncThunk(
  'internalState/initializeTabs',
  async function initializeTabsThunkFn(
    {
      discoverSessionId,
      shouldClearAllTabs,
    }: { discoverSessionId: string | undefined; shouldClearAllTabs?: boolean },
    { dispatch, getState, extra: { services, tabsStorageManager, customizationContext } }
  ) {
    const { userId: existingUserId, spaceId: existingSpaceId } = getState();

    const getUserId = async () => {
      try {
        return (await services.core.security?.authc.getCurrentUser()).profile_uid ?? '';
      } catch {
        // ignore as user id might be unavailable for some deployments
        return '';
      }
    };

    const getSpaceId = async () => {
      try {
        return (await services.spaces?.getActiveSpace())?.id ?? '';
      } catch {
        // ignore
        return '';
      }
    };

    const [userId, spaceId, persistedDiscoverSession] = await Promise.all([
      existingUserId === undefined ? getUserId() : existingUserId,
      existingSpaceId === undefined ? getSpaceId() : existingSpaceId,
      discoverSessionId ? services.savedSearch.getDiscoverSession(discoverSessionId) : undefined,
    ]);

    if (customizationContext.displayMode === 'standalone' && persistedDiscoverSession) {
      services.chrome.recentlyAccessed.add(
        getSavedSearchFullPathUrl(persistedDiscoverSession.id),
        persistedDiscoverSession.title ??
          i18n.translate('discover.defaultDiscoverSessionTitle', {
            defaultMessage: 'Untitled Discover session',
          }),
        persistedDiscoverSession.id
      );

      setBreadcrumbs({ services, titleBreadcrumbText: persistedDiscoverSession.title });
    }

    const initialTabsState = tabsStorageManager.loadLocally({
      userId,
      spaceId,
      persistedDiscoverSession,
      shouldClearAllTabs,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    const history = services.getScopedHistory();
    const locationState = history?.location.state;

    // Replace instead of push the tab ID to the URL on initialization in order to
    // avoid capturing a browser history entry with a potentially empty _tab state
    await tabsStorageManager.pushSelectedTabIdToUrl(initialTabsState.selectedTabId, {
      replace: true,
    });

    // Manually restore the previous location state since pushing the tab ID
    // to the URL clears it, but initial location state must be passed on,
    // e.g. ad hoc data views specs
    if (locationState) {
      history.replace({ ...history.location, state: locationState });
    }

    dispatch(
      setTabs({
        ...initialTabsState,
        updatedDiscoverSession: persistedDiscoverSession,
      })
    );

    return { userId, spaceId, persistedDiscoverSession };
  }
);

export const restoreTab: InternalStateThunkActionCreator<[{ restoreTabId: string }]> = ({
  restoreTabId,
}) =>
  function restoreTabThunkFn(dispatch, getState) {
    const currentState = getState();

    // Restoring the 'new' tab ID is a no-op because it represents a placeholder for creating new tabs,
    // not an actual tab that can be restored.
    if (restoreTabId === currentState.tabs.unsafeCurrentId || restoreTabId === NEW_TAB_ID) {
      return;
    }

    const currentTabs = selectAllTabs(currentState);
    const currentTab = selectTab(currentState, currentState.tabs.unsafeCurrentId);

    let items = currentTabs;
    // search among open tabs
    let selectedItem = items.find((tab) => tab.id === restoreTabId);

    if (!selectedItem) {
      // search among recently closed tabs
      const recentlyClosedTabs = selectRecentlyClosedTabs(currentState);
      const closedTab = recentlyClosedTabs.find((tab) => tab.id === restoreTabId);
      if (closedTab) {
        // reopening one of the closed tabs
        selectedItem = omit(closedTab, 'closedAt');
        items = [...items, closedTab];
      }
    }

    return dispatch(
      updateTabs({
        items,
        // TODO: should we even call updateTabs if selectedItem is not found or just return?
        selectedItem: selectedItem || currentTab,
      })
    );
  };

export const openInNewTab: InternalStateThunkActionCreator<
  [
    {
      tabLabel?: string;
      appState?: TabState['initialAppState'];
      globalState?: TabState['globalState'];
      searchSessionId?: string;
    }
  ]
> = ({ tabLabel, appState, globalState, searchSessionId }) =>
  function openInNewTabThunkFn(dispatch, getState) {
    const initialAppState = appState ? cloneDeep(appState) : undefined;
    const initialGlobalState = globalState ? cloneDeep(globalState) : {};
    const currentState = getState();
    const currentTabs = selectAllTabs(currentState);

    const newDefaultTab: TabState = {
      ...DEFAULT_TAB_STATE,
      ...createTabItem(currentTabs),
      initialAppState,
      globalState: initialGlobalState,
    };

    if (tabLabel) {
      newDefaultTab.label = tabLabel;
    }

    if (searchSessionId) {
      newDefaultTab.dataRequestParams = {
        ...newDefaultTab.dataRequestParams,
        searchSessionId,
      };
    }

    return dispatch(
      updateTabs({ items: [...currentTabs, newDefaultTab], selectedItem: newDefaultTab })
    );
  };

export const clearRecentlyClosedTabs: InternalStateThunkActionCreator = () =>
  function clearRecentlyClosedTabsThunkFn(dispatch, getState) {
    const currentState = getState();
    return dispatch(
      setTabs({
        allTabs: selectAllTabs(currentState),
        selectedTabId: currentState.tabs.unsafeCurrentId,
        recentlyClosedTabs: [],
      })
    );
  };

export const disconnectTab: InternalStateThunkActionCreator<[TabActionPayload]> = ({ tabId }) =>
  function disconnectTabThunkFn(_, __, { runtimeStateManager }) {
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
    const stateContainer = tabRuntimeState.stateContainer$.getValue();
    stateContainer?.dataState.cancel();
    stateContainer?.actions.stopSyncing();
    tabRuntimeState.customizationService$.getValue()?.cleanup();
  };

function differenceIterateeByTabId(tab: TabState) {
  return tab.id;
}
