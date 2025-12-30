/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createBrowserHistory } from 'history';
import { getDiscoverStateContainer } from '../application/main/state_management/discover_state';
import { savedSearchMockWithTimeField, savedSearchMock } from './saved_search';
import { discoverServiceMock } from './services';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { mockCustomizationContext } from '../customizations/__mocks__/customization_context';
import type { RuntimeStateManager } from '../application/main/state_management/redux';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  fromSavedSearchToSavedObjectTab,
  selectTab,
  selectTabRuntimeState,
} from '../application/main/state_management/redux';
import type { DiscoverServices, HistoryLocationState } from '../build_services';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import type { History } from 'history';
import type { DiscoverCustomizationContext } from '../customizations';
import { createCustomizationService } from '../customizations/customization_service';
import { createTabsStorageManager } from '../application/main/state_management/tabs_storage_manager';
import { internalStateActions } from '../application/main/state_management/redux';
import { DEFAULT_TAB_STATE } from '../application/main/state_management/redux';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { DiscoverSearchSessionManager } from '../application/main/state_management/discover_search_session';
import { updateSavedSearch } from '../application/main/state_management/utils/update_saved_search';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import {
  getCurrentUrlState,
  getInitialState,
} from '../application/main/state_management/discover_app_state_container';

export function getDiscoverStateMock({
  isTimeBased = true,
  savedSearch,
  additionalPersistedTabs = [],
  stateStorageContainer,
  runtimeStateManager,
  history,
  customizationContext = mockCustomizationContext,
  services: originalServices = discoverServiceMock,
}: {
  isTimeBased?: boolean;
  savedSearch?: SavedSearch | false;
  additionalPersistedTabs?: DiscoverSessionTab[];
  runtimeStateManager?: RuntimeStateManager;
  stateStorageContainer?: IKbnUrlStateStorage;
  history?: History<HistoryLocationState>;
  customizationContext?: DiscoverCustomizationContext;
  services?: DiscoverServices;
} = {}) {
  if (!history) {
    history = createBrowserHistory<HistoryLocationState>();
    history.push('/');
  }
  const services = { ...originalServices, history };
  const storeInSessionStorage = services.uiSettings.get('state:storeInSessionStorage');
  const toasts = services.core.notifications.toasts;
  stateStorageContainer ??= createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history: services.history,
    useHashQuery: customizationContext.displayMode !== 'embedded',
    ...(toasts && withNotifyOnErrors(toasts)),
  });
  runtimeStateManager ??= createRuntimeStateManager();
  const tabsStorageManager = createTabsStorageManager({
    urlStateStorage: stateStorageContainer,
    storage: services.storage,
  });
  const searchSessionManager = new DiscoverSearchSessionManager({
    history: services.history,
    session: services.data.search.session,
  });
  const internalState = createInternalStateStore({
    services,
    customizationContext,
    runtimeStateManager,
    urlStateStorage: stateStorageContainer,
    tabsStorageManager,
    searchSessionManager,
  });
  const finalSavedSearch =
    savedSearch === false
      ? undefined
      : savedSearch ?? (isTimeBased ? savedSearchMockWithTimeField : savedSearchMock);
  const persistedDiscoverSession: DiscoverSession | undefined = finalSavedSearch
    ? {
        ...finalSavedSearch,
        id: finalSavedSearch.id ?? 'test-id',
        title: finalSavedSearch.title ?? 'title',
        description: finalSavedSearch.description ?? 'description',
        tabs: [
          fromSavedSearchToSavedObjectTab({
            tab: {
              id: finalSavedSearch.id ?? '',
              label: finalSavedSearch.title ?? '',
            },
            savedSearch: finalSavedSearch,
            services,
          }),
          ...additionalPersistedTabs,
        ],
      }
    : undefined;
  const mockUserId = 'mockUserId';
  const mockSpaceId = 'mockSpaceId';
  const initialTabsState = tabsStorageManager.loadLocally({
    userId: mockUserId,
    spaceId: mockSpaceId,
    persistedDiscoverSession,
    defaultTabState: DEFAULT_TAB_STATE,
  });
  if (!persistedDiscoverSession) {
    const stableTabId = 'stable-test-initial-tab-id';
    const selectedTab = initialTabsState.allTabs.find(
      (t) => t.id === initialTabsState.selectedTabId
    );
    if (selectedTab) {
      selectedTab.id = stableTabId;
    }
    initialTabsState.selectedTabId = stableTabId;
  }
  // TODO: This should really be called async (or preferably the full `initializeTabs` thunk),
  // but doing so would make the whole function async, which would require a lot of test refactoring
  void tabsStorageManager.pushSelectedTabIdToUrl(initialTabsState.selectedTabId);
  internalState.dispatch(internalStateActions.setTabs(initialTabsState));
  internalState.dispatch(
    internalStateActions.initializeTabs.fulfilled(
      {
        userId: mockUserId,
        spaceId: mockSpaceId,
        persistedDiscoverSession,
      },
      'requestId',
      { discoverSessionId: finalSavedSearch?.id }
    )
  );

  const container = getDiscoverStateContainer({
    tabId: internalState.getState().tabs.unsafeCurrentId,
    services,
    customizationContext,
    stateStorageContainer,
    internalState,
    runtimeStateManager,
    searchSessionManager,
  });
  container.appState.set(
    getInitialState({
      initialUrlState: getCurrentUrlState(stateStorageContainer, services),
      persistedTab: persistedDiscoverSession?.tabs[0],
      dataView: finalSavedSearch?.searchSource.getField('index'),
      services,
    })
  );
  container.appState.resetToState(container.appState.get());

  const tabRuntimeState = selectTabRuntimeState(
    runtimeStateManager,
    internalState.getState().tabs.unsafeCurrentId
  );
  tabRuntimeState.customizationService$.next({
    ...createCustomizationService(),
    cleanup: async () => {},
  });
  tabRuntimeState.stateContainer$.next(container);

  if (finalSavedSearch) {
    const currentTab = selectTab(internalState.getState(), container.getCurrentTab().id);
    const dataView = finalSavedSearch.searchSource.getField('index');

    container.savedSearchState.set(
      updateSavedSearch({
        savedSearch: finalSavedSearch,
        dataView,
        initialInternalState: undefined,
        appState: container.appState.get(),
        globalState: currentTab.globalState,
        services,
      })
    );

    if (dataView) {
      internalState.dispatch(
        internalStateActions.loadDataViewList.fulfilled([dataView as DataViewListItem], 'requestId')
      );
    }
  }

  return container;
}
