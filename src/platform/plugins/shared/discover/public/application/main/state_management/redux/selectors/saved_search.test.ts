/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { getTabStateMock, getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import { selectTabSavedSearch } from './saved_search';
import { selectTabRuntimeState } from '../runtime_state';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { dataViewWithNoTimefieldMock } from '../../../../../__mocks__/data_view_no_timefield';
import { DataSourceType } from '../../../../../../common/data_sources';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const {
    internalState,
    runtimeStateManager,
    initializeTabs,
    initializeSingleTab,
    getCurrentTab,
    addNewTab,
  } = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewWithTimefieldMock, dataViewWithNoTimefieldMock],
  });
  const testQuery = { query: 'test query', language: 'kuery' };
  const persistedTab = getPersistedTabMock({
    tabId: 'persisted-tab',
    dataView: dataViewWithTimefieldMock,
    appStateOverrides: {
      columns: ['message', 'extension'],
      query: testQuery,
      sort: [['timestamp', 'desc']],
    },
    services,
  });
  const persistedDiscoverSession = createDiscoverSessionMock({
    id: 'test-session-id',
    title: 'Test Session',
    description: 'Test Description',
    tabs: [persistedTab],
  });

  await initializeTabs({ persistedDiscoverSession });
  await initializeSingleTab({ tabId: persistedTab.id });

  return { internalState, runtimeStateManager, services, getCurrentTab, addNewTab };
};

describe('selectTabSavedSearch', () => {
  it('creates a saved search from tab state with session metadata', async () => {
    const { internalState, runtimeStateManager, services, getCurrentTab } = await setup();
    const currentTab = getCurrentTab();

    const savedSearch = await selectTabSavedSearch({
      tabId: currentTab.id,
      getState: internalState.getState,
      runtimeStateManager,
      services,
    });

    expect(savedSearch).toBeDefined();
    expect(savedSearch?.id).toBe('test-session-id');
    expect(savedSearch?.title).toBe('Test Session');
    expect(savedSearch?.description).toBe('Test Description');
    expect(savedSearch?.columns).toEqual(['message', 'extension']);
    expect(savedSearch?.sort).toEqual([['timestamp', 'desc']]);
  });

  it('returns saved search without session id when no persisted session exists', async () => {
    const services = createDiscoverServicesMock();
    const { internalState, runtimeStateManager, initializeTabs, addNewTab } =
      getDiscoverInternalStateMock({
        services,
        persistedDataViews: [dataViewWithTimefieldMock],
      });

    await initializeTabs();
    await addNewTab({
      tab: getTabStateMock({
        id: 'new-tab',
        initialInternalState: {
          serializedSearchSource: { index: dataViewWithTimefieldMock.id },
        },
        appState: {
          columns: ['bytes'],
          dataSource: {
            type: DataSourceType.DataView,
            dataViewId: dataViewWithTimefieldMock.id!,
          },
        },
      }),
    });

    const savedSearch = await selectTabSavedSearch({
      tabId: 'new-tab',
      getState: internalState.getState,
      runtimeStateManager,
      services,
    });

    expect(savedSearch).toBeDefined();
    expect(savedSearch?.id).toBeUndefined();
    expect(savedSearch?.title).toBeUndefined();
    expect(savedSearch?.columns).toEqual(['bytes']);
  });

  it('includes time restore settings when timeRestore is enabled', async () => {
    const { internalState, runtimeStateManager, services, addNewTab } = await setup();

    const tabWithTimeRestore = getTabStateMock({
      id: 'time-restore-tab',
      initialInternalState: {
        serializedSearchSource: { index: dataViewWithTimefieldMock.id },
      },
      globalState: {
        timeRange: { from: 'now-15m', to: 'now' },
        refreshInterval: { pause: false, value: 5000 },
      },
      attributes: {
        timeRestore: true,
      },
    });

    await addNewTab({ tab: tabWithTimeRestore });

    const savedSearch = await selectTabSavedSearch({
      tabId: tabWithTimeRestore.id,
      getState: internalState.getState,
      runtimeStateManager,
      services,
    });

    expect(savedSearch?.timeRestore).toBe(true);
    expect(savedSearch?.timeRange).toEqual({ from: 'now-15m', to: 'now' });
    expect(savedSearch?.refreshInterval).toEqual({ pause: false, value: 5000 });
  });

  it('excludes time settings when timeRestore is disabled', async () => {
    const { internalState, runtimeStateManager, services, addNewTab } = await setup();

    const tabWithoutTimeRestore = getTabStateMock({
      id: 'no-time-restore-tab',
      initialInternalState: {
        serializedSearchSource: { index: dataViewWithTimefieldMock.id },
      },
      globalState: {
        timeRange: { from: 'now-30m', to: 'now' },
        refreshInterval: { pause: false, value: 5000 },
      },
      attributes: {
        timeRestore: false,
      },
    });

    await addNewTab({ tab: tabWithoutTimeRestore });

    const savedSearch = await selectTabSavedSearch({
      tabId: tabWithoutTimeRestore.id,
      getState: internalState.getState,
      runtimeStateManager,
      services,
    });

    expect(savedSearch?.timeRestore).toBe(false);
    expect(savedSearch?.timeRange).toBeUndefined();
    expect(savedSearch?.refreshInterval).toBeUndefined();
  });

  it('includes view mode and chart settings', async () => {
    const { internalState, runtimeStateManager, services, addNewTab } = await setup();

    const tabWithViewSettings = getTabStateMock({
      id: 'view-mode-tab',
      initialInternalState: {
        serializedSearchSource: { index: dataViewWithTimefieldMock.id },
      },
      appState: {
        hideChart: true,
        rowHeight: 3,
        headerRowHeight: 2,
        rowsPerPage: 50,
        breakdownField: 'extension',
        interval: 'auto',
        dataSource: {
          type: DataSourceType.DataView,
          dataViewId: dataViewWithTimefieldMock.id!,
        },
      },
    });

    await addNewTab({ tab: tabWithViewSettings });

    const savedSearch = await selectTabSavedSearch({
      tabId: tabWithViewSettings.id,
      getState: internalState.getState,
      runtimeStateManager,
      services,
    });

    expect(savedSearch?.hideChart).toBe(true);
    expect(savedSearch?.rowHeight).toBe(3);
    expect(savedSearch?.headerRowHeight).toBe(2);
    expect(savedSearch?.rowsPerPage).toBe(50);
    expect(savedSearch?.breakdownField).toBe('extension');
    expect(savedSearch?.chartInterval).toBe('auto');
  });

  it('uses data view from runtime state for searchSource serialization', async () => {
    const { internalState, runtimeStateManager, services, getCurrentTab } = await setup();
    const currentTab = getCurrentTab();

    // The tab is already initialized with dataViewWithTimefieldMock
    // Set a different data view in runtime state
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTab.id);
    tabRuntimeState.currentDataView$.next(dataViewWithNoTimefieldMock);

    const savedSearch = await selectTabSavedSearch({
      tabId: currentTab.id,
      getState: internalState.getState,
      runtimeStateManager,
      services,
    });

    // The saved search's searchSource should use the data view from runtime state
    expect(savedSearch?.searchSource.getField('index')).toBe(dataViewWithNoTimefieldMock);
    expect(savedSearch?.searchSource.getField('index')?.id).toBe(dataViewWithNoTimefieldMock.id);
  });

  it('uses serializedSearchSource when tab is not initialized', async () => {
    const { internalState, runtimeStateManager, services, addNewTab } = await setup();
    const newTab = getTabStateMock({
      id: 'non-initialized-tab',
      initialInternalState: {
        serializedSearchSource: { index: dataViewWithTimefieldMock.id },
      },
      appState: {
        columns: ['message'],
        dataSource: {
          type: DataSourceType.DataView,
          dataViewId: dataViewWithTimefieldMock.id!,
        },
      },
    });

    // Add tab but don't initialize it (no stateContainer)
    await addNewTab({ tab: newTab });

    const savedSearch = await selectTabSavedSearch({
      tabId: newTab.id,
      getState: internalState.getState,
      runtimeStateManager,
      services,
    });

    // Should fall back to serializedSearchSource when tab is not initialized
    expect(savedSearch?.searchSource.getField('index')?.id).toBe(dataViewWithTimefieldMock.id);
  });
});
