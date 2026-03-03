/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getDiscoverStateContainer,
  type DiscoverStateContainer,
} from '../application/main/state_management/discover_state';
import {
  getDataStateContainer,
  type DiscoverDataStateContainer,
} from '../application/main/state_management/discover_data_state_container';
import { savedSearchMockWithTimeField, savedSearchMock } from './saved_search';
import { createDiscoverServicesMock, discoverServiceMock } from './services';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { mockCustomizationContext } from '../customizations/__mocks__/customization_context';
import type { RuntimeStateManager, TabState } from '../application/main/state_management/redux';
import {
  DEFAULT_TAB_STATE,
  internalStateActions,
  createInternalStateStore,
  createRuntimeStateManager,
  fromSavedSearchToSavedObjectTab,
  selectAllTabs,
  selectTab,
  selectTabRuntimeState,
} from '../application/main/state_management/redux';
import type { DiscoverServices, HistoryLocationState } from '../build_services';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { History } from 'history';
import {
  getConnectedCustomizationService,
  type DiscoverCustomizationContext,
} from '../customizations';
import { createCustomizationService } from '../customizations/customization_service';
import { createTabsStorageManager } from '../application/main/state_management/tabs_storage_manager';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { DiscoverSearchSessionManager } from '../application/main/state_management/discover_search_session';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { isObject, omit } from 'lodash';
import { getCurrentUrlState } from '../application/main/state_management/utils/cleanup_url_state';
import { getInitialAppState } from '../application/main/state_management/utils/get_initial_app_state';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { SaveDiscoverSessionThunkParams } from '../application/main/state_management/redux/actions';
import { filter, firstValueFrom, timeout } from 'rxjs';
import { FetchStatus } from '../application/types';

interface CreateInternalStateStoreMockOptions {
  runtimeStateManager?: RuntimeStateManager;
  stateStorageContainer?: IKbnUrlStateStorage;
  customizationContext?: DiscoverCustomizationContext;
  services?: DiscoverServices;
}

function createInternalStateStoreMock({
  runtimeStateManager,
  stateStorageContainer,
  customizationContext = mockCustomizationContext,
  services = createDiscoverServicesMock(),
}: CreateInternalStateStoreMockOptions = {}) {
  const storeInSessionStorage = services.uiSettings.get('state:storeInSessionStorage');
  const toasts = services.core.notifications.toasts;
  stateStorageContainer ??= createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history: services.history,
    useHashQuery: customizationContext.displayMode !== 'embedded',
    ...toasts,
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

  return {
    internalState,
    services,
    customizationContext,
    runtimeStateManager,
    stateStorageContainer,
    tabsStorageManager,
    searchSessionManager,
  };
}

export type InternalStateMockToolkit = ReturnType<typeof getDiscoverInternalStateMock>;

export function getDiscoverInternalStateMock({
  persistedDataViews,
  ...options
}: CreateInternalStateStoreMockOptions & { persistedDataViews?: DataView[] } = {}) {
  const {
    internalState,
    services,
    customizationContext,
    runtimeStateManager,
    stateStorageContainer,
    searchSessionManager,
  } = createInternalStateStoreMock(options);

  jest.spyOn(services.dataViews, 'get').mockImplementation((id) => {
    const dataView = persistedDataViews?.find((dv) => dv.id === id);

    if (!dataView) {
      throw new Error(
        `Data view with ID "${id}" not found in provided persistedDataViews mock array (available: ${persistedDataViews
          ?.map((dv) => dv.id)
          .join(', ')})`
      );
    }

    return Promise.resolve(dataView);
  });

  jest.spyOn(services.dataViews, 'create').mockImplementation((spec) =>
    Promise.resolve(
      buildDataViewMock({
        id: spec.id,
        title: spec.title,
        name: spec.name ?? spec.title,
        type: spec.type,
        timeFieldName: spec.timeFieldName,
        isPersisted: false,
      })
    )
  );

  jest.spyOn(services.dataViews, 'getIdsWithTitle').mockImplementation(() =>
    Promise.resolve(
      persistedDataViews?.map((dv) => ({
        id: dv.id!,
        title: dv.getIndexPattern(),
        name: dv.name,
        timeFieldName: dv.timeFieldName,
      })) ?? []
    )
  );

  const originalSearchSourceCreate = services.data.search.searchSource.create;

  services.data.search.searchSource.create = jest.fn(async (fields) => {
    if (typeof fields?.index === 'string') {
      const dataView = persistedDataViews?.find((dv) => dv.id === fields.index);

      if (!dataView) {
        throw new Error(
          `Data view with ID "${fields.index}" not found in provided persistedDataViews mock array`
        );
      }

      return createSearchSourceMock({ ...omit(fields, 'parent'), index: dataView });
    }

    if (isObject(fields?.index) && fields.index.id) {
      // Handle ad hoc data view specs by creating a data view from the spec
      const adHocDataView = await services.dataViews.create(fields.index);
      return createSearchSourceMock({ ...omit(fields, 'parent'), index: adHocDataView });
    }

    return originalSearchSourceCreate(fields);
  });

  jest.spyOn(services.savedSearch, 'saveDiscoverSession').mockImplementation((discoverSession) =>
    Promise.resolve({
      ...discoverSession,
      id: discoverSession.id ?? 'new-session',
      managed: false,
    })
  );

  const assertTabsAreInitialized = <T extends (...params: Parameters<T>) => ReturnType<T>>(
    fn: T
  ): T => {
    return ((...params: Parameters<T>) => {
      const state = internalState.getState();

      if (!Boolean(state.tabs.unsafeCurrentId)) {
        throw new Error('Tabs have not been initialized yet');
      }

      return fn(...params);
    }) as T;
  };

  const toolkit = {
    internalState,
    runtimeStateManager,
    services,
    initializeTabs: async ({
      persistedDiscoverSession,
    }: { persistedDiscoverSession?: DiscoverSession } = {}) => {
      if (persistedDiscoverSession) {
        jest
          .spyOn(services.savedSearch, 'getDiscoverSession')
          .mockResolvedValueOnce(persistedDiscoverSession);
      }

      internalState.dispatch(
        internalStateActions.setInitializationState({ hasESData: true, hasUserDataView: true })
      );

      // Populate savedDataViews before initializing tabs,
      // needed for computing default app state values (like default sort)
      await internalState.dispatch(internalStateActions.loadDataViewList());

      await internalState
        .dispatch(
          internalStateActions.initializeTabs({
            discoverSessionId: persistedDiscoverSession?.id,
          })
        )
        .unwrap();
    },
    initializeSingleTab: assertTabsAreInitialized(
      async ({
        tabId,
        skipWaitForDataFetching,
      }: {
        tabId: string;
        skipWaitForDataFetching?: boolean;
      }) => {
        await toolkit.switchToTab({ tabId });

        const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);

        if (tabRuntimeState.stateContainer$.getValue()) {
          throw new Error(`Tab with ID "${tabId}" has already been initialized`);
        }

        const stateContainer = getDiscoverStateContainer({
          tabId: internalState.getState().tabs.unsafeCurrentId,
          services,
          customizationContext,
          stateStorageContainer,
          internalState,
          runtimeStateManager,
          searchSessionManager,
        });
        const customizationService = await getConnectedCustomizationService({
          stateContainer,
          customizationCallbacks: [],
          services,
        });

        const dataStateContainer = getDataStateContainer({
          services,
          searchSessionManager,
          internalState,
          runtimeStateManager,
          injectCurrentTab: stateContainer.injectCurrentTab,
          getCurrentTab: stateContainer.getCurrentTab,
        });

        await internalState.dispatch(
          internalStateActions.initializeSingleTab({
            tabId,
            initializeSingleTabParams: {
              stateContainer,
              customizationService,
              dataStateContainer,
              dataViewSpec: undefined,
              esqlControls: undefined,
              defaultUrlState: undefined,
            },
          })
        );

        if (!skipWaitForDataFetching) {
          await toolkit.waitForDataFetching({ tabId });
        }

        return { stateContainer, customizationService, dataStateContainer };
      }
    ),
    waitForDataFetching: assertTabsAreInitialized(async ({ tabId }: { tabId: string }) => {
      const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
      const dataStateContainer = tabRuntimeState.dataStateContainer$.getValue();
      const dataMain$ = dataStateContainer?.data$.main$;

      if (!dataMain$) {
        throw new Error(`Tab with ID "${tabId}" has not been initialized yet`);
      }

      const fetchLoadingStatuses = [
        FetchStatus.LOADING,
        FetchStatus.LOADING_MORE,
        FetchStatus.PARTIAL,
      ];

      try {
        await firstValueFrom(
          dataMain$.pipe(
            filter(({ fetchStatus }) => fetchLoadingStatuses.includes(fetchStatus)),
            timeout({ first: 250 })
          )
        );
      } catch {
        // eslint-disable-next-line no-console
        console.log(`Data fetching did not start within 250ms for tab with ID "${tabId}"`);
        return;
      }

      const fetchFinishedStatuses = [
        FetchStatus.UNINITIALIZED,
        FetchStatus.COMPLETE,
        FetchStatus.ERROR,
      ];

      await firstValueFrom(
        dataMain$.pipe(filter(({ fetchStatus }) => fetchFinishedStatuses.includes(fetchStatus)))
      );
    }),
    getCurrentTab: assertTabsAreInitialized(() => {
      return selectTab(internalState.getState(), internalState.getState().tabs.unsafeCurrentId);
    }),
    getCurrentTabDataStateContainer: assertTabsAreInitialized(() => {
      const tabId = internalState.getState().tabs.unsafeCurrentId;
      const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
      return tabRuntimeState.dataStateContainer$.getValue()!;
    }),
    addNewTab: assertTabsAreInitialized(async ({ tab }: { tab: TabState }) => {
      const currentState = internalState.getState();

      await internalState.dispatch(
        internalStateActions.updateTabs({
          items: [...selectAllTabs(currentState), tab],
          selectedItem: tab,
        })
      );
    }),
    switchToTab: assertTabsAreInitialized(async ({ tabId }: { tabId: string }) => {
      const currentState = internalState.getState();
      const tab = selectTab(currentState, tabId);

      if (!tab) {
        throw new Error(`Tab with ID "${tabId}" not found in state`);
      }

      await internalState.dispatch(
        internalStateActions.updateTabs({
          items: [...selectAllTabs(currentState)],
          selectedItem: tab,
        })
      );
    }),
    saveDiscoverSession: assertTabsAreInitialized(
      async (params: Partial<SaveDiscoverSessionThunkParams> = {}) => {
        const { persistedDiscoverSession } = internalState.getState();

        await internalState
          .dispatch(
            internalStateActions.saveDiscoverSession({
              newTitle: persistedDiscoverSession?.title ?? 'new title',
              newCopyOnSave: false,
              newTimeRestore:
                persistedDiscoverSession?.tabs.some((tab) => tab.timeRestore) ?? false,
              newDescription: persistedDiscoverSession?.description ?? 'new description',
              newTags: persistedDiscoverSession?.tags ?? [],
              isTitleDuplicateConfirmed: false,
              onTitleDuplicate: jest.fn(),
              ...params,
            })
          )
          .unwrap();
      }
    ),
  };

  return toolkit;
}

/**
 * @deprecated
 * This util was from before we implemented Discover tabs,
 * and is not well suited for tabs-first state tests.
 * Prefer {@link getDiscoverInternalStateMock} for new tests.
 */
export function getDiscoverStateMock({
  isTimeBased = true,
  savedSearch,
  additionalPersistedTabs = [],
  history,
  services = createDiscoverServicesMock(),
  ...options
}: CreateInternalStateStoreMockOptions & {
  isTimeBased?: boolean;
  savedSearch?: SavedSearch | false;
  additionalPersistedTabs?: DiscoverSessionTab[];
  history?: History<HistoryLocationState>;
} = {}) {
  if (history) {
    services = { ...services, history };
  }

  const {
    internalState,
    customizationContext,
    runtimeStateManager,
    stateStorageContainer,
    tabsStorageManager,
    searchSessionManager,
  } = createInternalStateStoreMock({
    ...options,
    services,
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

  const currentTabId = internalState.getState().tabs.unsafeCurrentId;

  internalState.dispatch(
    internalStateActions.resetAppState({
      tabId: currentTabId,
      appState: getInitialAppState({
        initialUrlState: getCurrentUrlState(stateStorageContainer, services),
        persistedTab: persistedDiscoverSession?.tabs[0],
        dataView: finalSavedSearch?.searchSource.getField('index'),
        services,
      }),
    })
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
    const dataView = finalSavedSearch.searchSource.getField('index');

    tabRuntimeState.currentDataView$.next(dataView);

    if (dataView) {
      internalState.dispatch(
        internalStateActions.loadDataViewList.fulfilled([dataView as DataViewListItem], 'requestId')
      );
    }
  }

  return container;
}

/**
 * Creates a `dataStateContainer` for testing purposes.
 * This is primarily used when calling `initializeSingleTab` which stores the container.
 */
export function createDataStateContainer(
  stateContainer: DiscoverStateContainer,
  services: DiscoverServices = discoverServiceMock
): DiscoverDataStateContainer {
  const { runtimeStateManager, internalState } = stateContainer;

  return getDataStateContainer({
    internalState,
    services,
    searchSessionManager: stateContainer.searchSessionManager,
    runtimeStateManager,
    injectCurrentTab: stateContainer.injectCurrentTab,
    getCurrentTab: stateContainer.getCurrentTab,
  });
}

/**
 * Returns an existing `dataStateContainer` from the runtime state, or creates and stores a new one
 * if it doesn't exist. This is useful for tests that need `dataStateContainer` without going through
 * the full `initializeSingleTab` flow (e.g., tests using `initializeAndSync` directly).
 */
export function getOrCreateDataStateFromMock(
  stateContainer: DiscoverStateContainer,
  services: DiscoverServices = discoverServiceMock
): DiscoverDataStateContainer {
  const { runtimeStateManager, internalState } = stateContainer;
  const tabId = internalState.getState().tabs.unsafeCurrentId;
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);

  // Return existing dataStateContainer if already initialized
  const existing = tabRuntimeState.dataStateContainer$.getValue();
  if (existing) {
    return existing;
  }

  const dataStateContainer = createDataStateContainer(stateContainer, services);
  tabRuntimeState.dataStateContainer$.next(dataStateContainer);

  return dataStateContainer;
}
