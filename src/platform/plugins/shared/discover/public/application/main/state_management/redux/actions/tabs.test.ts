/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../../../context_awareness/toolkit';
import { waitFor } from '@testing-library/react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { FilterStateStore, type Filter, type TimeRange } from '@kbn/es-query';
import { map } from 'rxjs';
import { TEST_PROFILE_STATE_DEF } from '../../../../../context_awareness/__mocks__/profile_state';
import {
  ProfileStateType,
  type ProfileStateDefinition,
} from '../../../../../../common/context_awareness';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import { createTabItem } from '../utils';
import {
  createRuntimeStateManager,
  selectAllTabs,
  selectRecentlyClosedTabs,
  selectTab,
  internalStateActions,
  DEFAULT_TAB_STATE,
  selectHasUnsavedChanges,
} from '..';
import * as runtimeStateModule from '../runtime_state';
import * as contextAwarenessToolkitModule from '../context_awareness_toolkit';
import {
  APP_STATE_URL_KEY,
  GLOBAL_STATE_URL_KEY,
  PROFILE_STATE_URL_KEY,
} from '../../../../../../common/constants';
import { TABS_LOCAL_STORAGE_KEY } from '../../tabs_storage_manager';
import type { DiscoverAppState, TabState } from '../types';
import type { UISession } from '@kbn/data-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';
import { SearchSessionStatus } from '@kbn/data-plugin/common';
import type { DiscoverAppLocatorParams } from '../../../../../../common';
import type { SerializableRecord } from '@kbn/utility-types';

interface SecondaryProfileState extends SerializableRecord {
  secondaryUrlValue: string;
}

const SECONDARY_PROFILE_STATE_DEF: ProfileStateDefinition<SecondaryProfileState> = {
  key: 'secondaryProfileState',
  descriptor: {
    secondaryUrlValue: { type: ProfileStateType.Url },
  },
  defaultState: {
    secondaryUrlValue: 'defaultSecondaryUrl',
  },
};

const createSearchSession = (restoreState: DiscoverAppLocatorParams): UISession => ({
  id: 'search-session',
  name: 'Background search',
  appId: 'discover',
  created: '2025-01-01T00:00:00.000Z',
  expires: null,
  status: SearchSessionStatus.COMPLETE,
  idMapping: {},
  numSearches: 1,
  reloadUrl: '',
  restoreUrl: '',
  initialState: {},
  restoreState,
  version: '1.0.0',
});

const setup = async () => {
  const services = createDiscoverServicesMock();
  services.profileStateRegistry.registerDefinition(TEST_PROFILE_STATE_DEF);
  services.profileStateRegistry.registerDefinition(SECONDARY_PROFILE_STATE_DEF);
  const runtimeStateManager = createRuntimeStateManager();
  const toolkit = getDiscoverInternalStateMock({
    services,
    runtimeStateManager,
    persistedDataViews: [dataViewMockWithTimeField],
  });

  const persistedTab = getPersistedTabMock({
    dataView: dataViewMockWithTimeField,
    services,
  });

  await toolkit.initializeTabs({
    persistedDiscoverSession: createDiscoverSessionMock({
      id: 'test-session',
      tabs: [persistedTab],
    }),
  });

  return toolkit;
};

describe('tabs actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('restoring a clean draft with URL state', () => {
    afterEach(() => {
      new Storage(window.sessionStorage).remove(TABS_LOCAL_STORAGE_KEY);
    });

    it.each([
      { name: 'reload', sharedQuery: undefined },
      { name: 'shared link', sharedQuery: { query: 'extension: png', language: 'kuery' } },
    ])('keeps the view and URL consistent across $name and reload', async ({ sharedQuery }) => {
      const services = createDiscoverServicesMock();
      services.storage = new Storage(window.sessionStorage);
      let currentTime = services.timefilter.getTime();
      jest.spyOn(services.timefilter, 'getTime').mockImplementation(() => currentTime);
      jest.spyOn(services.timefilter, 'setTime').mockImplementation((time) => {
        currentTime = { ...currentTime, ...(time as Partial<TimeRange>) };
      });
      const pinnedFilters: Filter[] = [
        {
          meta: { disabled: false, negate: false, alias: null },
          query: { match_all: {} },
          $state: { store: FilterStateStore.GLOBAL_STATE },
        },
      ];
      const savedTab = getPersistedTabMock({
        dataView: dataViewMockWithTimeField,
        services,
        appStateOverrides: { query: { query: 'extension: css', language: 'kuery' } },
        overridenTimeRestore: true,
        globalStateOverrides: { filters: pinnedFilters, timeRange: { from: 'now-15m', to: 'now' } },
      });
      const updatedTab = {
        ...savedTab,
        serializedSearchSource: {
          ...savedTab.serializedSearchSource,
          query: { query: 'extension: jpg', language: 'kuery' },
        },
        timeRange: { from: 'now-1h', to: 'now' },
      };

      const createToolkit = () => {
        // A fresh filter manager per load, as after a page reload, so pinned filters come from the URL
        const filterManager = new FilterManager(services.uiSettings);
        services.filterManager = filterManager;
        services.data.query.filterManager = filterManager;
        services.data.query.state$ = filterManager.getUpdates$().pipe(
          map(() => ({
            state: { filters: filterManager.getFilters() },
            changes: { filters: true, appFilters: true, globalFilters: true },
          }))
        );
        return getDiscoverInternalStateMock({
          services,
          tabsStorageEnabled: true,
          persistedDataViews: [dataViewMockWithTimeField],
        });
      };
      const openSessionAndExpect = async (
        toolkit: ReturnType<typeof createToolkit>,
        tab: DiscoverSessionTab,
        {
          query,
          time,
          hasUnsavedChanges,
        }: { query: DiscoverAppState['query']; time?: TimeRange; hasUnsavedChanges: boolean }
      ) => {
        await toolkit.initializeTabs({
          persistedDiscoverSession: createDiscoverSessionMock({ id: 'session', tabs: [tab] }),
        });
        expect(toolkit.stateStorageContainer.get(APP_STATE_URL_KEY)).toMatchObject({
          hideSidebar: false,
          savedQuery: 'saved-query-id',
        });
        await toolkit.initializeSingleTab({ tabId: tab.id });
        const changes = selectHasUnsavedChanges(toolkit.internalState.getState(), {
          runtimeStateManager: toolkit.runtimeStateManager,
          services,
        });
        toolkit.internalState.dispatch(internalStateActions.setUnsavedChanges(changes));

        expect(changes.hasUnsavedChanges).toBe(hasUnsavedChanges);
        expect(toolkit.getCurrentTab()).toMatchObject({
          appState: { query, hideSidebar: false, savedQuery: 'saved-query-id' },
          globalState: { timeRange: time },
        });
        await waitFor(() => {
          expect(toolkit.stateStorageContainer.get(APP_STATE_URL_KEY)).toMatchObject({
            query,
            hideSidebar: false,
            savedQuery: 'saved-query-id',
          });
          expect(toolkit.stateStorageContainer.get(GLOBAL_STATE_URL_KEY)).toMatchObject({
            time,
            filters: JSON.parse(JSON.stringify(pinnedFilters)),
          });
          expect(services.storage.get(TABS_LOCAL_STORAGE_KEY).openTabs[0]).toMatchObject({
            hasUnsavedChanges,
            appState: { query },
          });
        });
        toolkit.internalState.dispatch(internalStateActions.disconnectTab({ tabId: tab.id }));
      };

      const firstLoad = createToolkit();
      await firstLoad.stateStorageContainer.set(APP_STATE_URL_KEY, {
        hideSidebar: false,
        savedQuery: 'saved-query-id',
      });
      await firstLoad.stateStorageContainer.set(GLOBAL_STATE_URL_KEY, { filters: pinnedFilters });
      await openSessionAndExpect(firstLoad, savedTab, {
        query: savedTab.serializedSearchSource.query,
        time: savedTab.timeRange,
        hasUnsavedChanges: false,
      });

      if (sharedQuery) {
        await firstLoad.stateStorageContainer.set(APP_STATE_URL_KEY, {
          ...firstLoad.stateStorageContainer.get<DiscoverAppState>(APP_STATE_URL_KEY),
          query: sharedQuery,
        });
      }

      // After the session is updated elsewhere, and again on the following reload
      const expectedAfterUpdate = {
        query: sharedQuery ?? updatedTab.serializedSearchSource.query,
        time: sharedQuery ? savedTab.timeRange : updatedTab.timeRange,
        hasUnsavedChanges: Boolean(sharedQuery),
      };
      await openSessionAndExpect(createToolkit(), updatedTab, expectedAfterUpdate);
      await openSessionAndExpect(createToolkit(), updatedTab, expectedAfterUpdate);
    });
  });

  describe('openInNewTabExtPointAction', () => {
    it('maps ext point params into a new tab state', async () => {
      const { internalState } = await setup();
      const initialTabs = selectAllTabs(internalState.getState());
      const params = {
        query: { esql: 'FROM logs-* | LIMIT 10' },
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
        tabLabel: 'Logs',
        esqlApproximation: true,
      };

      await internalState.dispatch(internalStateActions.openInNewTabExtPointAction(params));

      const tabs = selectAllTabs(internalState.getState());
      const newTab = tabs[tabs.length - 1];

      expect(tabs).toHaveLength(initialTabs.length + 1);
      expect(newTab.label).toBe('Logs');
      expect(newTab.appState.query).toEqual(params.query);
      expect(newTab.appState.esqlApproximation).toBe(params.esqlApproximation);
      expect(newTab.globalState.timeRange).toEqual(params.timeRange);
    });
  });

  describe('openSearchSessionInNewTab', () => {
    it('seeds the new tab with parsed Persistent and Url profile state', async () => {
      const { internalState } = await setup();
      const initialTabs = selectAllTabs(internalState.getState());
      const searchSession = createSearchSession({
        searchSessionId: 'search-session-id',
        profileState: {
          [TEST_PROFILE_STATE_DEF.key]: {
            uiValue: 'ignoredUi',
            urlValue: TEST_PROFILE_STATE_DEF.defaultState.urlValue,
            persistentValue: 'restoredPersistent',
            unknownValue: 'ignored',
          },
          [SECONDARY_PROFILE_STATE_DEF.key]: {
            secondaryUrlValue: 'restoredSecondaryUrl',
          },
          unknownProfileState: {
            urlValue: 'ignored',
          },
        },
      });

      await internalState.dispatch(
        internalStateActions.openSearchSessionInNewTab({ searchSession })
      );

      const tabs = selectAllTabs(internalState.getState());
      const newTab = tabs[tabs.length - 1];

      expect(tabs).toHaveLength(initialTabs.length + 1);
      expect(newTab.label).toBe(searchSession.name);
      expect(newTab.profileState).toEqual({
        [TEST_PROFILE_STATE_DEF.key]: {
          urlValue: TEST_PROFILE_STATE_DEF.defaultState.urlValue,
          persistentValue: 'restoredPersistent',
        },
        [SECONDARY_PROFILE_STATE_DEF.key]: {
          secondaryUrlValue: 'restoredSecondaryUrl',
        },
      });
    });
  });

  describe('setTabs', () => {
    it('passes per-tab context awareness toolkit into createTabRuntimeState', async () => {
      const { internalState, runtimeStateManager, getCurrentTab } = await setup();
      const currentTab = getCurrentTab();
      const allTabs = selectAllTabs(internalState.getState());
      const newTab = {
        ...DEFAULT_TAB_STATE,
        ...createTabItem(allTabs),
      };
      const expectedToolkit = EMPTY_CONTEXT_AWARENESS_TOOLKIT;

      jest
        .spyOn(contextAwarenessToolkitModule, 'createContextAwarenessToolkit')
        .mockReturnValue(expectedToolkit);
      const createTabRuntimeStateSpy = jest.spyOn(runtimeStateModule, 'createTabRuntimeState');

      internalState.dispatch(
        internalStateActions.setTabs({
          allTabs: [...allTabs, newTab],
          selectedTabId: currentTab.id,
          recentlyClosedTabs: [],
        })
      );

      expect(createTabRuntimeStateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          toolkit: expectedToolkit,
        })
      );

      expect(runtimeStateManager.tabs.byId[newTab.id]).toBeDefined();
    });

    it('does not carry the restored unsaved changes flag into a closed and reopened tab', async () => {
      const { internalState, getCurrentTab } = await setup();
      const allTabs = selectAllTabs(internalState.getState());
      const cleanTab = {
        ...DEFAULT_TAB_STATE,
        ...createTabItem(allTabs),
        hasUnsavedChanges: false,
      };
      const setTabs = (tabs: TabState[]) =>
        internalState.dispatch(
          internalStateActions.setTabs({
            allTabs: tabs,
            selectedTabId: getCurrentTab().id,
            recentlyClosedTabs: [],
          })
        );

      setTabs([...allTabs, cleanTab]);
      setTabs(allTabs);

      const [closedTab] = selectRecentlyClosedTabs(internalState.getState());
      expect(closedTab.id).toBe(cleanTab.id);
      expect(closedTab.hasUnsavedChanges).toBeUndefined();

      await internalState.dispatch(internalStateActions.restoreTab({ restoreTabId: cleanTab.id }));

      expect(selectTab(internalState.getState(), cleanTab.id).hasUnsavedChanges).toBeUndefined();
    });
  });

  describe('updateTabs', () => {
    it('copies profile state when duplicating a tab', async () => {
      const { internalState, getCurrentTab } = await setup();
      const currentTab = getCurrentTab();
      const allTabs = selectAllTabs(internalState.getState());
      const profileState = {
        ...TEST_PROFILE_STATE_DEF.defaultState,
        uiValue: 'primary',
      };

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId: currentTab.id,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState,
        })
      );

      const duplicatedTab = {
        ...createTabItem(allTabs),
        duplicatedFromId: currentTab.id,
      };

      await internalState.dispatch(
        internalStateActions.updateTabs({
          items: [...allTabs, duplicatedTab],
          selectedItem: duplicatedTab,
        })
      );

      expect(selectTab(internalState.getState(), duplicatedTab.id).profileState).toEqual({
        testProfileState: {
          uiValue: 'primary',
        },
      });
    });

    it('preserves auto-refresh when duplicating a tab', async () => {
      const { internalState, getCurrentTab, services } = await setup();
      const activeRefreshInterval = { pause: false, value: 5000 };
      services.timefilter.getRefreshInterval = jest.fn(() => activeRefreshInterval);

      const currentTab = getCurrentTab();
      const allTabs = selectAllTabs(internalState.getState());
      const duplicatedTab = {
        ...createTabItem(allTabs),
        duplicatedFromId: currentTab.id,
      };

      await internalState.dispatch(
        internalStateActions.updateTabs({
          items: [...allTabs, duplicatedTab],
          selectedItem: duplicatedTab,
        })
      );

      expect(
        selectTab(internalState.getState(), duplicatedTab.id).globalState.refreshInterval
      ).toEqual(activeRefreshInterval);
      expect(selectTab(internalState.getState(), duplicatedTab.id).skipInitialFetch).toBeFalsy();
    });

    it('pauses auto-refresh on a fresh tab', async () => {
      const { internalState, getCurrentTab, services } = await setup();
      const activeRefreshInterval = { pause: false, value: 5000 };
      services.timefilter.getRefreshInterval = jest.fn(() => activeRefreshInterval);

      const sourceTabId = getCurrentTab().id;
      const allTabs = selectAllTabs(internalState.getState());
      const freshTab = createTabItem(allTabs);

      await internalState.dispatch(
        internalStateActions.updateTabs({
          items: [...allTabs, freshTab],
          selectedItem: freshTab,
        })
      );

      expect(selectTab(internalState.getState(), freshTab.id).globalState.refreshInterval).toEqual({
        ...activeRefreshInterval,
        pause: true,
      });
      expect(selectTab(internalState.getState(), freshTab.id).skipInitialFetch).toBe(true);
      expect(
        selectTab(internalState.getState(), sourceTabId).globalState.refreshInterval
      ).not.toEqual({
        ...activeRefreshInterval,
        pause: true,
      });
    });

    it('replaces profile URL state when switching selected tabs', async () => {
      const {
        internalState,
        stateStorageContainer,
        initializeSingleTab,
        getCurrentTab,
        addNewTab,
        switchToTab,
      } = await setup();
      const currentTab = getCurrentTab();
      const profileState = {
        ...TEST_PROFILE_STATE_DEF.defaultState,
        uiValue: 'ui',
        urlValue: 'urlFromOtherTab',
      };
      const secondaryProfileState = {
        ...SECONDARY_PROFILE_STATE_DEF.defaultState,
        secondaryUrlValue: 'secondaryUrlFromOtherTab',
      };

      await initializeSingleTab({ tabId: currentTab.id, skipWaitForDataFetching: true });

      const otherTab = {
        ...DEFAULT_TAB_STATE,
        ...createTabItem(selectAllTabs(internalState.getState())),
        id: 'other-tab',
        profileState: {
          [TEST_PROFILE_STATE_DEF.key]: profileState,
          [SECONDARY_PROFILE_STATE_DEF.key]: secondaryProfileState,
        },
      };

      await addNewTab({ tab: otherTab });
      await initializeSingleTab({ tabId: otherTab.id });

      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');

      await switchToTab({ tabId: currentTab.id });

      expect(setUrlStateSpy).toHaveBeenCalledWith(PROFILE_STATE_URL_KEY, undefined, {
        replace: true,
      });

      setUrlStateSpy.mockClear();

      await switchToTab({ tabId: otherTab.id });

      expect(setUrlStateSpy).toHaveBeenCalledWith(
        PROFILE_STATE_URL_KEY,
        {
          [TEST_PROFILE_STATE_DEF.key]: {
            urlValue: 'urlFromOtherTab',
          },
        },
        { replace: true }
      );
    });

    it('starts fresh tabs with empty profile state', async () => {
      const { internalState } = await setup();
      const allTabs = selectAllTabs(internalState.getState());
      const newTab = createTabItem(allTabs);

      await internalState.dispatch(
        internalStateActions.updateTabs({
          items: [...allTabs, newTab],
          selectedItem: newTab,
        })
      );

      expect(selectTab(internalState.getState(), newTab.id).profileState).toEqual({});
    });

    it('restores persistent and url profile state when restoring a recently closed tab', async () => {
      const { internalState, getCurrentTab } = await setup();
      const currentTab = getCurrentTab();
      const allTabs = selectAllTabs(internalState.getState());
      const remainingTab = {
        ...DEFAULT_TAB_STATE,
        ...createTabItem(allTabs),
      };

      internalState.dispatch(
        internalStateActions.setTabs({
          allTabs: [...allTabs, remainingTab],
          selectedTabId: currentTab.id,
          recentlyClosedTabs: [],
        })
      );
      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId: currentTab.id,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState: {
            ...TEST_PROFILE_STATE_DEF.defaultState,
            uiValue: 'ui',
            urlValue: 'url',
            persistentValue: 'persistent',
          },
        })
      );
      internalState.dispatch(
        internalStateActions.setTabs({
          allTabs: [remainingTab],
          selectedTabId: remainingTab.id,
          recentlyClosedTabs: [],
        })
      );

      const restoredTab = {
        ...createTabItem([remainingTab]),
        restoredFromId: currentTab.id,
      };

      await internalState.dispatch(
        internalStateActions.updateTabs({
          items: [remainingTab, restoredTab],
          selectedItem: restoredTab,
        })
      );

      expect(selectTab(internalState.getState(), restoredTab.id).profileState).toEqual({
        testProfileState: {
          urlValue: 'url',
          persistentValue: 'persistent',
        },
      });
    });
  });
});
