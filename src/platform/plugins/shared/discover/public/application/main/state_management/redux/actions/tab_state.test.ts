/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import {
  DEFAULT_TAB_STATE,
  createTabItem,
  type DiscoverAppState,
  internalStateActions,
  selectAllTabs,
  selectTab,
} from '..';
import { DataSourceType } from '../../../../../../common/data_sources';
import { APP_STATE_URL_KEY } from '../../../../../../common';
import { GLOBAL_STATE_URL_KEY, PROFILE_STATE_URL_KEY } from '../../../../../../common/constants';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { mockControlState } from '../../../../../__mocks__/esql_controls';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import { selectDataSourceProfileId, selectTabRuntimeState } from '../runtime_state';
import { TEST_PROFILE_STATE_DEF } from '../../../../../context_awareness/__mocks__/profile_state';
import type { ProfileStateDefinition } from '../../../../../context_awareness';
import { ProfileStateType } from '../../../../../context_awareness';

interface SecondaryProfileState {
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

const setup = async () => {
  const services = createDiscoverServicesMock();
  services.profileStateRegistry.registerDefinition(TEST_PROFILE_STATE_DEF);
  services.profileStateRegistry.registerDefinition(SECONDARY_PROFILE_STATE_DEF);
  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewMockWithTimeField],
  });

  const persistedTab = getPersistedTabMock({
    dataView: dataViewMockWithTimeField,
    services,
    appStateOverrides: {
      query: { esql: 'FROM test-index' },
      dataSource: { type: DataSourceType.Esql },
      columns: ['field1', 'field2'],
      sort: [['bytes', 'desc']],
    },
  });

  await toolkit.initializeTabs({
    persistedDiscoverSession: createDiscoverSessionMock({
      id: 'test-session',
      tabs: [persistedTab],
    }),
  });
  await toolkit.initializeSingleTab({ tabId: persistedTab.id });

  return {
    ...toolkit,
    tabId: persistedTab.id,
  };
};

const clearActiveDataSourceProfileState = ({
  runtimeStateManager,
  tabId,
}: {
  runtimeStateManager: Awaited<ReturnType<typeof setup>>['runtimeStateManager'];
  tabId: string;
}) => {
  const scopedProfilesManager = selectTabRuntimeState(
    runtimeStateManager,
    tabId
  ).scopedProfilesManager$.getValue();
  const contexts = scopedProfilesManager.getContexts();

  jest.spyOn(scopedProfilesManager, 'getContexts').mockReturnValue({
    ...contexts,
    dataSourceContext: {
      ...contexts.dataSourceContext,
      profileState: undefined,
    },
  });
};

describe('tab_state actions', () => {
  describe('setAppState', () => {
    it('should sync snapshotsByProfileId for the current profile', async () => {
      const { internalState, runtimeStateManager, tabId } = await setup();
      const profileId = selectDataSourceProfileId(runtimeStateManager, tabId);

      internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            query: { language: 'kuery', query: 'response:200' },
            columns: ['message'],
            rowHeight: 3,
            breakdownField: 'extension',
            hideChart: true,
          },
        })
      );

      const snapshotsByProfileId = selectTab(internalState.getState(), tabId).defaultProfileState
        .snapshotsByProfileId;

      expect(snapshotsByProfileId[profileId]).toEqual({
        columns: ['message'],
        rowHeight: 3,
        breakdownField: 'extension',
        hideChart: true,
      });
    });
  });

  describe('syncProfileStateSnapshot', () => {
    it('should sync snapshotsByProfileId for the current profile when triggered separately', async () => {
      const { internalState, runtimeStateManager, tabId } = await setup();
      const profileId = selectDataSourceProfileId(runtimeStateManager, tabId);
      const snapshotsByProfileId = selectTab(internalState.getState(), tabId).defaultProfileState
        .snapshotsByProfileId;

      internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            columns: ['message'],
            hideChart: true,
          },
          isSystemTriggered: true,
        })
      );

      expect(
        selectTab(internalState.getState(), tabId).defaultProfileState.snapshotsByProfileId
      ).toBe(snapshotsByProfileId);

      internalState.dispatch(internalStateActions.syncProfileStateSnapshot({ tabId }));

      const currentSnapshotsByProfileId = selectTab(internalState.getState(), tabId)
        .defaultProfileState.snapshotsByProfileId;

      expect(currentSnapshotsByProfileId[profileId]).not.toBeUndefined();
      expect(currentSnapshotsByProfileId[profileId]?.columns).toEqual(['message']);
      expect(currentSnapshotsByProfileId[profileId]?.hideChart).toBe(true);
    });
  });

  describe('setProfileState', () => {
    it('updates profile state and lets URL sync push active profile URL state', async () => {
      const { internalState, stateStorageContainer, tabId } = await setup();
      const profileState = {
        ...TEST_PROFILE_STATE_DEF.defaultState,
        uiValue: 'ui',
        urlValue: 'nextUrl',
        persistentValue: 'persistent',
      };
      const expectedUrlState = {
        [TEST_PROFILE_STATE_DEF.key]: {
          urlValue: 'nextUrl',
        },
      };
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');
      const flushSpy = jest.spyOn(stateStorageContainer.kbnUrlControls, 'flush');

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState,
        })
      );

      expect(selectTab(internalState.getState(), tabId).profileState).toEqual({
        [TEST_PROFILE_STATE_DEF.key]: {
          uiValue: 'ui',
          urlValue: 'nextUrl',
          persistentValue: 'persistent',
        },
      });
      expect(setUrlStateSpy).toHaveBeenCalledWith(PROFILE_STATE_URL_KEY, expectedUrlState);
      expect(flushSpy).not.toHaveBeenCalled();
      expect(stateStorageContainer.get(PROFILE_STATE_URL_KEY)).toEqual(expectedUrlState);
    });

    it('clears pushed profile URL state when URL fields reset to defaults', async () => {
      const { internalState, stateStorageContainer, tabId } = await setup();
      const nextUrlProfileState = {
        ...TEST_PROFILE_STATE_DEF.defaultState,
        urlValue: 'nextUrl',
      };
      const expectedUrlState = {
        [TEST_PROFILE_STATE_DEF.key]: {
          urlValue: 'nextUrl',
        },
      };
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');
      const flushSpy = jest.spyOn(stateStorageContainer.kbnUrlControls, 'flush');

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState: nextUrlProfileState,
        })
      );

      expect(stateStorageContainer.get(PROFILE_STATE_URL_KEY)).toEqual(expectedUrlState);
      setUrlStateSpy.mockClear();

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState: TEST_PROFILE_STATE_DEF.defaultState,
        })
      );

      expect(selectTab(internalState.getState(), tabId).profileState).toEqual({});
      expect(setUrlStateSpy).toHaveBeenCalledWith(PROFILE_STATE_URL_KEY, undefined);
      expect(flushSpy).not.toHaveBeenCalled();
      expect(stateStorageContainer.get(PROFILE_STATE_URL_KEY)).toBeNull();
      setUrlStateSpy.mockClear();

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState: nextUrlProfileState,
        })
      );

      expect(setUrlStateSpy).toHaveBeenCalledWith(PROFILE_STATE_URL_KEY, expectedUrlState);
      expect(stateStorageContainer.get(PROFILE_STATE_URL_KEY)).toEqual(expectedUrlState);
    });

    it('replaces active profile URL state and flushes the URL update when requested', async () => {
      const { internalState, services, stateStorageContainer, tabId } = await setup();
      const profileState = {
        ...TEST_PROFILE_STATE_DEF.defaultState,
        uiValue: 'ui',
        urlValue: 'nextUrl',
        persistentValue: 'persistent',
      };
      const expectedUrlState = {
        [TEST_PROFILE_STATE_DEF.key]: {
          urlValue: 'nextUrl',
        },
      };
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');
      const flushSpy = jest.spyOn(stateStorageContainer.kbnUrlControls, 'flush');
      const historyLength = services.history.length;

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState,
          historyMethod: 'replace',
        })
      );

      expect(selectTab(internalState.getState(), tabId).profileState).toEqual({
        [TEST_PROFILE_STATE_DEF.key]: {
          uiValue: 'ui',
          urlValue: 'nextUrl',
          persistentValue: 'persistent',
        },
      });
      expect(setUrlStateSpy).toHaveBeenCalledWith(PROFILE_STATE_URL_KEY, expectedUrlState, {
        replace: true,
      });
      expect(services.history.length).toBe(historyLength);
      expect(flushSpy).toHaveBeenCalledWith();
      expect(stateStorageContainer.get(PROFILE_STATE_URL_KEY)).toEqual(expectedUrlState);
    });

    it('preserves active profile URL state in Redux when non-URL profile state changes', async () => {
      const { internalState, stateStorageContainer, tabId } = await setup();
      const profileState = {
        ...TEST_PROFILE_STATE_DEF.defaultState,
        uiValue: 'ui',
        urlValue: 'nextUrl',
        persistentValue: 'persistent',
      };
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');
      const flushSpy = jest.spyOn(stateStorageContainer.kbnUrlControls, 'flush');

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState,
        })
      );
      setUrlStateSpy.mockClear();
      flushSpy.mockClear();

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState: {
            ...profileState,
            persistentValue: 'updatedPersistent',
          },
        })
      );

      expect(selectTab(internalState.getState(), tabId).profileState).toEqual({
        [TEST_PROFILE_STATE_DEF.key]: {
          uiValue: 'ui',
          urlValue: 'nextUrl',
          persistentValue: 'updatedPersistent',
        },
      });
      expect(setUrlStateSpy.mock.calls.filter(([key]) => key === PROFILE_STATE_URL_KEY)).toEqual(
        []
      );
      expect(flushSpy).not.toHaveBeenCalled();
    });

    it('does not dispatch or write URL state when profile state is unchanged', async () => {
      const { internalState, stateStorageContainer, tabId } = await setup();
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');
      const flushSpy = jest.spyOn(stateStorageContainer.kbnUrlControls, 'flush');

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState: TEST_PROFILE_STATE_DEF.defaultState,
        })
      );

      expect(selectTab(internalState.getState(), tabId).profileState).toEqual({});
      expect(setUrlStateSpy).not.toHaveBeenCalled();
      expect(flushSpy).not.toHaveBeenCalled();
    });

    it('updates Redux state without writing URL state when profile state is not active', async () => {
      const { internalState, runtimeStateManager, stateStorageContainer, tabId } = await setup();
      const profileState = {
        ...TEST_PROFILE_STATE_DEF.defaultState,
        urlValue: 'nextUrl',
      };
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');
      const flushSpy = jest.spyOn(stateStorageContainer.kbnUrlControls, 'flush');

      clearActiveDataSourceProfileState({ runtimeStateManager, tabId });
      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState,
        })
      );

      expect(selectTab(internalState.getState(), tabId).profileState).toEqual({
        [TEST_PROFILE_STATE_DEF.key]: {
          urlValue: 'nextUrl',
        },
      });
      expect(setUrlStateSpy).not.toHaveBeenCalled();
      expect(flushSpy).not.toHaveBeenCalled();
    });

    it('does nothing when the tab has been closed', async () => {
      const { internalState, stateStorageContainer, tabId } = await setup();
      const allTabs = selectAllTabs(internalState.getState());
      const remainingTab = {
        ...DEFAULT_TAB_STATE,
        ...createTabItem(allTabs),
        id: 'remaining-tab',
      };
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');

      internalState.dispatch(
        internalStateActions.setTabs({
          allTabs: [...allTabs, remainingTab],
          selectedTabId: remainingTab.id,
          recentlyClosedTabs: [],
        })
      );
      internalState.dispatch(
        internalStateActions.setTabs({
          allTabs: [remainingTab],
          selectedTabId: remainingTab.id,
          recentlyClosedTabs: [],
        })
      );

      expect(() =>
        internalState.dispatch(
          internalStateActions.setProfileState({
            tabId,
            profileStateDefinition: TEST_PROFILE_STATE_DEF,
            profileState: {
              ...TEST_PROFILE_STATE_DEF.defaultState,
              urlValue: 'nextUrl',
            },
          })
        )
      ).not.toThrow();

      expect(setUrlStateSpy).not.toHaveBeenCalledWith(PROFILE_STATE_URL_KEY, expect.anything());
      expect(selectTab(internalState.getState(), remainingTab.id).profileState).toEqual({});
    });
  });

  describe('updateAppStateAndReplaceUrl', () => {
    it('should only sync changed app state fields after replacing the URL for the active tab', async () => {
      const { internalState, runtimeStateManager, stateStorageContainer, tabId } = await setup();
      const profileId = selectDataSourceProfileId(runtimeStateManager, tabId);

      internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            columns: ['field1'],
            rowHeight: 3,
          },
        })
      );

      internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            columns: ['field1'],
            rowHeight: 8,
          },
          isSystemTriggered: true,
        })
      );

      await internalState.dispatch(
        internalStateActions.updateAppStateAndReplaceUrl({
          tabId,
          appState: {
            columns: ['message'],
          },
        })
      );

      const currentTab = selectTab(internalState.getState(), tabId);
      const persistedAppState = stateStorageContainer.get<DiscoverAppState>(APP_STATE_URL_KEY);

      expect(persistedAppState).toEqual(currentTab.appState);
      expect(currentTab.appState.columns).toEqual(['message']);
      expect(currentTab.appState.rowHeight).toBe(8);
      expect(currentTab.defaultProfileState.snapshotsByProfileId[profileId]).toEqual({
        columns: ['message'],
        rowHeight: 3,
      });
    });

    it('should not sync snapshotsByProfileId after replacing the URL for system-triggered updates', async () => {
      const { internalState, runtimeStateManager, tabId } = await setup();
      const profileId = selectDataSourceProfileId(runtimeStateManager, tabId);

      internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            columns: ['field1'],
          },
        })
      );

      await internalState.dispatch(
        internalStateActions.updateAppStateAndReplaceUrl({
          tabId,
          appState: {
            columns: ['field2'],
          },
          isSystemTriggered: true,
        })
      );

      const snapshotsByProfileId = selectTab(internalState.getState(), tabId).defaultProfileState
        .snapshotsByProfileId;

      expect(snapshotsByProfileId[profileId]).toEqual({
        breakdownField: undefined,
        columns: ['field1'],
        hideChart: undefined,
        rowHeight: undefined,
      });
    });
  });

  describe('pushCurrentTabStateToUrl', () => {
    it('should write the current tab state to the URL even when state is unchanged', async () => {
      const { internalState, stateStorageContainer, tabId } = await setup();
      const currentTab = selectTab(internalState.getState(), tabId);
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');

      await internalState.dispatch(internalStateActions.pushCurrentTabStateToUrl({ tabId }));

      expect(setUrlStateSpy).toHaveBeenCalledWith(APP_STATE_URL_KEY, currentTab.appState, {
        replace: true,
      });
      expect(setUrlStateSpy).toHaveBeenCalledWith(
        GLOBAL_STATE_URL_KEY,
        {
          time: currentTab.globalState.timeRange,
          refreshInterval: currentTab.globalState.refreshInterval,
          filters: currentTab.globalState.filters,
        },
        {
          replace: true,
        }
      );
      expect(stateStorageContainer.get<DiscoverAppState>(APP_STATE_URL_KEY)).toEqual(
        currentTab.appState
      );
    });

    it('should preserve existing profile URL state before the data source profile is resolved', async () => {
      const { internalState, runtimeStateManager, stateStorageContainer, tabId } = await setup();
      const scopedProfilesManager = selectTabRuntimeState(
        runtimeStateManager,
        tabId
      ).scopedProfilesManager$.getValue();
      const existingUrlState = {
        [TEST_PROFILE_STATE_DEF.key]: {
          urlValue: 'sharedUrl',
        },
      };

      await stateStorageContainer.set(PROFILE_STATE_URL_KEY, existingUrlState);
      jest.spyOn(scopedProfilesManager, 'hasResolvedDataSourceProfile').mockReturnValue(false);
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');

      await internalState.dispatch(internalStateActions.pushCurrentTabStateToUrl({ tabId }));

      expect(setUrlStateSpy.mock.calls.filter(([key]) => key === PROFILE_STATE_URL_KEY)).toEqual(
        []
      );
      expect(stateStorageContainer.get(PROFILE_STATE_URL_KEY)).toEqual(existingUrlState);
    });

    it('should clear existing profile URL state once the data source profile is resolved without URL state', async () => {
      const { internalState, runtimeStateManager, stateStorageContainer, tabId } = await setup();
      const scopedProfilesManager = selectTabRuntimeState(
        runtimeStateManager,
        tabId
      ).scopedProfilesManager$.getValue();
      const existingUrlState = {
        [SECONDARY_PROFILE_STATE_DEF.key]: {
          secondaryUrlValue: 'sharedSecondaryUrl',
        },
      };

      expect(scopedProfilesManager.hasResolvedDataSourceProfile()).toBe(true);
      await stateStorageContainer.set(PROFILE_STATE_URL_KEY, existingUrlState);
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');

      await internalState.dispatch(internalStateActions.pushCurrentTabStateToUrl({ tabId }));

      expect(setUrlStateSpy).toHaveBeenCalledWith(PROFILE_STATE_URL_KEY, undefined, {
        replace: true,
      });
      expect(stateStorageContainer.get(PROFILE_STATE_URL_KEY)).toBeNull();
    });

    it('should write only the current profile URL state to the URL even when state is unchanged', async () => {
      const { internalState, stateStorageContainer, tabId } = await setup();
      const profileState = {
        ...TEST_PROFILE_STATE_DEF.defaultState,
        urlValue: 'nextUrl',
      };
      const secondaryProfileState = {
        ...SECONDARY_PROFILE_STATE_DEF.defaultState,
        secondaryUrlValue: 'secondaryUrl',
      };
      const expectedUrlState = {
        [TEST_PROFILE_STATE_DEF.key]: {
          urlValue: 'nextUrl',
        },
      };

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: TEST_PROFILE_STATE_DEF,
          profileState,
        })
      );
      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: SECONDARY_PROFILE_STATE_DEF,
          profileState: secondaryProfileState,
        })
      );
      const setUrlStateSpy = jest.spyOn(stateStorageContainer, 'set');

      await internalState.dispatch(internalStateActions.pushCurrentTabStateToUrl({ tabId }));

      expect(setUrlStateSpy).toHaveBeenCalledWith(PROFILE_STATE_URL_KEY, expectedUrlState, {
        replace: true,
      });
      expect(stateStorageContainer.get(PROFILE_STATE_URL_KEY)).toEqual(expectedUrlState);
    });
  });

  describe('transitionFromESQLToDataView', () => {
    it('should transition from ES|QL mode to Data View mode', async () => {
      const { internalState, runtimeStateManager, tabId } = await setup();
      const profileId = selectDataSourceProfileId(runtimeStateManager, tabId);
      const dataView = dataViewMockWithTimeField;
      let state = internalState.getState();
      let tab = selectTab(state, tabId);
      const prevDefaultProfileState = tab.defaultProfileState;

      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index' });
      expect(tab.appState.columns).toHaveLength(2);
      expect(tab.appState.sort).toEqual([['bytes', 'desc']]);
      expect(tab.appState.dataSource).toStrictEqual({
        type: DataSourceType.Esql,
      });

      expect(prevDefaultProfileState.fieldsToReset).toBe('none');
      expect(typeof prevDefaultProfileState.resetId).toBe('string');
      expect(prevDefaultProfileState.resetId).not.toEqual('');
      expect(prevDefaultProfileState.snapshotsByProfileId[profileId]).toEqual({
        breakdownField: '',
        columns: ['field1', 'field2'],
        hideChart: false,
        hideTable: false,
        hideSidebar: undefined,
        rowHeight: undefined,
      });

      // Transition to data view mode
      internalState.dispatch(
        internalStateActions.transitionFromESQLToDataView({
          tabId,
          dataView,
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the state was updated correctly
      expect(tab.appState.query).toStrictEqual({
        language: 'kuery',
        query: '',
      });
      expect(tab.appState.columns).toEqual([]);
      expect(tab.appState.sort).toEqual([[dataView.timeFieldName, 'desc']]);
      expect(tab.appState.dataSource).toStrictEqual({
        type: DataSourceType.DataView,
        dataViewId: dataView.id,
      });

      expect(tab.defaultProfileState.fieldsToReset).toBe('all');
      expect(typeof tab.defaultProfileState.resetId).toBe('string');
      expect(tab.defaultProfileState.snapshotsByProfileId[profileId]).toEqual({
        breakdownField: '',
        columns: [],
        hideChart: false,
        hideTable: false,
        hideSidebar: undefined,
        rowHeight: undefined,
      });
      expect(tab.defaultProfileState.resetId).not.toEqual(prevDefaultProfileState.resetId);
      expect(tab.defaultProfileState.resetId).not.toEqual('');
    });
  });

  describe('transitionFromDataViewToESQL', () => {
    it('should transition from Data View mode to ES|QL mode', async () => {
      const { internalState, runtimeStateManager, tabId } = await setup();
      const profileId = selectDataSourceProfileId(runtimeStateManager, tabId);
      const dataView = dataViewMockWithTimeField;

      const query = { query: "foo: 'bar'", language: 'kuery' };
      const filters = [{ meta: { index: 'the-data-view-id' }, query: { match_all: {} } }];
      internalState.dispatch(
        internalStateActions.setGlobalState({
          tabId,
          globalState: { filters },
        })
      );
      internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            query,
            dataSource: {
              type: DataSourceType.DataView,
              dataViewId: 'the-data-view-id',
            },
            sort: [
              ['@timestamp', 'asc'],
              ['bytes', 'desc'],
            ],
          },
        })
      );

      let state = internalState.getState();
      let tab = selectTab(state, tabId);
      const prevDefaultProfileState = tab.defaultProfileState;

      expect(tab.appState.query).toStrictEqual(query);
      expect(tab.appState.sort).toEqual([
        ['@timestamp', 'asc'],
        ['bytes', 'desc'],
      ]);
      expect(tab.globalState.filters).toStrictEqual(filters);
      expect(tab.appState.filters).toBeUndefined();
      expect(tab.appState.dataSource).toStrictEqual({
        type: DataSourceType.DataView,
        dataViewId: 'the-data-view-id',
      });

      expect(prevDefaultProfileState.fieldsToReset).toBe('none');
      expect(typeof prevDefaultProfileState.resetId).toBe('string');
      expect(prevDefaultProfileState.resetId).not.toEqual('');
      expect(prevDefaultProfileState.snapshotsByProfileId[profileId]).toEqual({
        breakdownField: undefined,
        columns: undefined,
        hideChart: undefined,
        hideTable: undefined,
        rowHeight: undefined,
      });

      // Transition to ES|QL mode
      internalState.dispatch(
        internalStateActions.transitionFromDataViewToESQL({
          tabId,
          dataView,
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the state was updated correctly
      expect(tab.appState.query).toStrictEqual({
        esql: 'FROM the-data-view-title | WHERE KQL("""foo: \'bar\'""")',
      });
      expect(tab.appState.sort).toBeUndefined();
      expect(tab.globalState.filters).toStrictEqual([]);
      expect(tab.appState.filters).toStrictEqual([]);
      expect(tab.appState.dataSource).toStrictEqual({
        type: DataSourceType.Esql,
      });

      expect(tab.defaultProfileState.fieldsToReset).toBe('all');
      expect(typeof tab.defaultProfileState.resetId).toBe('string');
      expect(tab.defaultProfileState.snapshotsByProfileId[profileId]).toEqual({
        breakdownField: undefined,
        columns: [],
        hideChart: undefined,
        hideTable: undefined,
        rowHeight: undefined,
      });
      expect(tab.defaultProfileState.resetId).not.toEqual(prevDefaultProfileState.resetId);
      expect(tab.defaultProfileState.resetId).not.toEqual('');
    });
  });

  describe('updateESQLQuery', () => {
    it('should update the ES|QL query string', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index' });

      // Update the ES|QL query string
      internalState.dispatch(
        internalStateActions.updateESQLQuery({
          tabId,
          queryOrUpdater: 'FROM test-index | WHERE status = 200',
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the query string was updated correctly
      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index | WHERE status = 200' });
    });

    it('should update the ES|QL query string using an updater function', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index' });

      // Update the ES|QL query string using an updater function
      internalState.dispatch(
        internalStateActions.updateESQLQuery({
          tabId,
          queryOrUpdater: (currentQuery) => {
            return currentQuery + ' | WHERE status = 404';
          },
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the query string was updated correctly
      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index | WHERE status = 404' });
    });
  });

  describe('updateAttributes', () => {
    it('should update individual tab attributes', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.attributes.controlGroupState).toBeUndefined();

      // Update the hideChart attribute
      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            controlGroupState: mockControlState,
          },
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the controlGroupState attribute was updated correctly
      expect(tab.attributes).toStrictEqual({
        controlGroupState: mockControlState,
        visContext: undefined,
        timeRestore: false,
      });
    });

    it('should not overwrite existing attributes when updating', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.attributes.visContext).toBeUndefined();
      const visContext = { some: 'context' };

      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            visContext,
          },
        })
      );

      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            controlGroupState: mockControlState,
          },
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the visContext attribute was not overwritten
      expect(tab.attributes.visContext).toBe(visContext);
      // Verify the controlGroupState attribute was updated correctly
      expect(tab.attributes.controlGroupState).toBe(mockControlState);
    });

    it('should not update attributes if they are the same', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.attributes.visContext).toBeUndefined();
      const visContext = { some: 'context' };

      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            visContext,
          },
        })
      );

      // Capture state after first update
      state = internalState.getState();
      tab = selectTab(state, tabId);
      expect(tab.attributes.visContext).toBe(visContext);

      const stateAfterFirstUpdate = state;

      // Dispatch the same update again
      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            visContext,
          },
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the state has not changed
      expect(state).toBe(stateAfterFirstUpdate);
      // Verify the visContext attribute remains the same
      expect(tab.attributes.visContext).toBe(visContext);
    });
  });
});
