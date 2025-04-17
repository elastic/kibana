/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import {
  createTabsStorageManager,
  TABS_LOCAL_STORAGE_KEY,
  type TabsInternalStatePayload,
} from './tabs_storage_manager';
import { defaultTabState } from './redux/internal_state';
import type { RecentlyClosedTabState, TabState } from './redux/types';
import { TABS_STATE_URL_KEY } from '../../../../common/constants';

const mockUserId = 'testUserId';
const mockSpaceId = 'testSpaceId';

const mockTab1: TabState = {
  id: 'tab1',
  label: 'Tab 1',
  ...defaultTabState,
  lastPersistedAppState: {
    columns: ['a', 'b'],
  },
  lastPersistedGlobalState: {
    timeRange: { from: '2025-04-16T14:07:55.127Z', to: '2025-04-16T14:12:55.127Z' },
    filters: [],
    refreshInterval: { pause: true, value: 1000 },
  },
};

const mockTab2: TabState = {
  id: 'tab2',
  label: 'Tab 2',
  ...defaultTabState,
  lastPersistedAppState: {
    columns: ['c', 'd'],
  },
  lastPersistedGlobalState: {
    timeRange: { from: '2025-04-17T03:07:55.127Z', to: '2025-04-17T03:12:55.127Z' },
    filters: [],
    refreshInterval: { pause: true, value: 1000 },
  },
};

const mockRecentlyClosedTab: RecentlyClosedTabState = {
  id: 'closedTab1',
  label: 'Closed tab 1',
  ...defaultTabState,
  lastPersistedAppState: {
    columns: ['e', 'f'],
  },
  lastPersistedGlobalState: {
    timeRange: { from: '2025-04-07T03:07:55.127Z', to: '2025-04-07T03:12:55.127Z' },
    filters: [],
    refreshInterval: { pause: true, value: 1000 },
  },
  closedAt: Date.now(),
};

const mockRecentlyClosedTab2: RecentlyClosedTabState = {
  ...mockRecentlyClosedTab,
  id: 'closedTab2',
  label: 'Closed tab 2',
};

const mockRecentlyClosedTab3: RecentlyClosedTabState = {
  ...mockRecentlyClosedTab,
  id: 'closedTab3',
  label: 'Closed tab 3 with another closedAt',
  closedAt: Date.now() + 1000,
};

describe('TabsStorageManager', () => {
  const create = () => {
    const urlStateStorage = createKbnUrlStateStorage();
    const services = createDiscoverServicesMock();

    return {
      services,
      urlStateStorage,
      tabsStorageManager: createTabsStorageManager({
        urlStateStorage,
        storage: services.storage,
        enabled: true,
      }),
    };
  };

  const toStoredTab = (tab: TabState | RecentlyClosedTabState) => ({
    id: tab.id,
    label: tab.label,
    appState: tab.lastPersistedAppState,
    globalState: tab.lastPersistedGlobalState,
    ...('closedAt' in tab ? { closedAt: tab.closedAt } : {}),
  });

  it('should persist tabs state to local storage and push to URL', async () => {
    const {
      services: { storage },
      tabsStorageManager,
      urlStateStorage,
    } = create();

    tabsStorageManager.loadLocally({
      userId: mockUserId, // register userId and spaceId in tabsStorageManager
      spaceId: mockSpaceId,
      defaultGroupId: 'test',
      defaultTabState,
    });

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const props: TabsInternalStatePayload = {
      groupId: 'group1',
      allTabs: [mockTab1, mockTab2],
      selectedTabId: 'tab1',
      recentlyClosedTabs: [mockRecentlyClosedTab],
    };

    await tabsStorageManager.persistLocally(props);

    expect(urlStateStorage.set).toHaveBeenCalledWith(TABS_STATE_URL_KEY, { tabId: 'tab1' });
    expect(storage.set).toHaveBeenCalledWith(
      TABS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        userId: mockUserId,
        spaceId: mockSpaceId,
        openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
        closedTabs: [toStoredTab(mockRecentlyClosedTab)],
      })
    );
  });

  it('should load tabs state from local storage and select one of open tabs', () => {
    const {
      tabsStorageManager,
      urlStateStorage,
      services: { storage },
    } = create();
    jest.spyOn(urlStateStorage, 'get');
    jest.spyOn(storage, 'get');

    const props: TabsInternalStatePayload = {
      groupId: 'group2',
      allTabs: [mockTab1, mockTab2],
      selectedTabId: 'tab2',
      recentlyClosedTabs: [mockRecentlyClosedTab],
    };

    storage.set(
      TABS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        userId: mockUserId,
        spaceId: mockSpaceId,
        openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
        closedTabs: [toStoredTab(mockRecentlyClosedTab)],
      })
    );

    urlStateStorage.set(TABS_STATE_URL_KEY, {
      tabId: props.selectedTabId,
    });

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      defaultGroupId: props.groupId,
      defaultTabState,
    });

    expect(loadedProps).toEqual(props);
    expect(urlStateStorage.get).toHaveBeenCalledWith(TABS_STATE_URL_KEY);
    expect(storage.get).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY);
    expect(urlStateStorage.set).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should load tabs state from local storage and select one of closed tabs', () => {
    const {
      tabsStorageManager,
      urlStateStorage,
      services: { storage },
    } = create();
    jest.spyOn(urlStateStorage, 'get');
    jest.spyOn(storage, 'get');

    const newClosedAt = Date.now() + 1000;
    jest.spyOn(Date, 'now').mockReturnValue(newClosedAt);

    const props: TabsInternalStatePayload = {
      groupId: 'group3',
      allTabs: [mockRecentlyClosedTab, mockRecentlyClosedTab2],
      selectedTabId: mockRecentlyClosedTab2.id,
      recentlyClosedTabs: [
        { ...mockTab1, closedAt: newClosedAt },
        { ...mockTab2, closedAt: newClosedAt },
        mockRecentlyClosedTab3,
        mockRecentlyClosedTab,
        mockRecentlyClosedTab2,
      ],
    };

    storage.set(
      TABS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        userId: mockUserId,
        spaceId: mockSpaceId,
        openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
        closedTabs: [
          toStoredTab(mockRecentlyClosedTab),
          toStoredTab(mockRecentlyClosedTab2),
          toStoredTab(mockRecentlyClosedTab3),
        ],
      })
    );

    urlStateStorage.set(TABS_STATE_URL_KEY, {
      tabId: mockRecentlyClosedTab2.id,
    });

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      defaultGroupId: props.groupId,
      defaultTabState,
    });

    expect(loadedProps).toEqual(props);
    expect(urlStateStorage.get).toHaveBeenCalledWith(TABS_STATE_URL_KEY);
    expect(storage.get).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY);
    expect(urlStateStorage.set).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should initialize with a default single tab', () => {
    const {
      tabsStorageManager,
      urlStateStorage,
      services: { storage },
    } = create();
    jest.spyOn(urlStateStorage, 'get');
    jest.spyOn(storage, 'get');

    const newClosedAt = Date.now() + 1000;
    jest.spyOn(Date, 'now').mockReturnValue(newClosedAt);

    storage.set(
      TABS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        userId: mockUserId,
        spaceId: mockSpaceId,
        openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
        closedTabs: [toStoredTab(mockRecentlyClosedTab)],
      })
    );

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      defaultGroupId: 'test',
      defaultTabState,
    });

    expect(loadedProps).toEqual(
      expect.objectContaining({
        groupId: 'test',
        recentlyClosedTabs: [
          { ...mockTab1, closedAt: newClosedAt },
          { ...mockTab2, closedAt: newClosedAt },
          mockRecentlyClosedTab,
        ],
      })
    );
    expect(loadedProps.allTabs).toHaveLength(1);
    expect(loadedProps.allTabs[0]).toEqual(
      expect.objectContaining({
        label: 'Untitled session',
      })
    );
    expect(loadedProps.selectedTabId).toBe(loadedProps.allTabs[0].id);
    expect(urlStateStorage.get).toHaveBeenCalledWith(TABS_STATE_URL_KEY);
    expect(storage.get).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY);
    expect(urlStateStorage.set).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should update tab state in local storage', () => {
    const { tabsStorageManager, services } = create();
    const storage = services.storage;

    storage.set(
      TABS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        userId: mockUserId,
        spaceId: mockSpaceId,
        openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
        closedTabs: [toStoredTab(mockRecentlyClosedTab)],
      })
    );

    jest.spyOn(storage, 'set');

    const updatedTabState = {
      ...mockTab1,
      lastPersistedAppState: {
        ...mockTab1.lastPersistedAppState,
        columns: ['a', 'b', 'c'],
      },
    };

    tabsStorageManager.updateTabStateLocally('tab1', updatedTabState);

    expect(storage.set).toHaveBeenCalledWith(
      TABS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        userId: mockUserId,
        spaceId: mockSpaceId,
        openTabs: [toStoredTab(updatedTabState), toStoredTab(mockTab2)],
        closedTabs: [toStoredTab(mockRecentlyClosedTab)],
      })
    );
  });

  it('should limit to N recently closed tabs', () => {
    const { tabsStorageManager } = create();

    const newClosedAt = 15;
    jest.spyOn(Date, 'now').mockReturnValue(newClosedAt);

    // no previously closed tabs
    expect(tabsStorageManager.getNRecentlyClosedTabs([], [mockTab1])).toEqual([
      { ...mockTab1, closedAt: newClosedAt },
    ]);

    // some previously closed tabs
    expect(
      tabsStorageManager.getNRecentlyClosedTabs(
        [
          { ...mockTab2, closedAt: 1 },
          { ...mockRecentlyClosedTab, closedAt: 100 },
        ],
        [mockTab1]
      )
    ).toEqual([
      { ...mockRecentlyClosedTab, closedAt: 100 },
      { ...mockTab1, closedAt: newClosedAt },
      { ...mockTab2, closedAt: 1 },
    ]);

    // over the limit
    const closedAtGroup1 = 40;
    const closedTabsGroup1 = Array.from({ length: 40 }, (_, i) => ({
      ...mockRecentlyClosedTab,
      id: `closedTab (1) ${i}`,
      label: `Closed tab (1) ${i}`,
      closedAt: closedAtGroup1,
    }));
    const closedAtGroup2 = 10;
    const closedTabsGroup2 = Array.from({ length: 10 }, (_, i) => ({
      ...mockRecentlyClosedTab,
      id: `closedTab (2) ${i}`,
      label: `Closed tab (2) ${i}`,
      closedAt: closedAtGroup2,
    }));

    const newClosedTabs = Array.from({ length: 15 }, (_, i) => ({
      ...mockTab1,
      id: `closedTab (new) ${i}`,
      label: `Closed tab (new) ${i}`,
    }));
    expect(
      tabsStorageManager.getNRecentlyClosedTabs(
        [...closedTabsGroup1, ...closedTabsGroup2],
        newClosedTabs
      )
    ).toEqual([
      ...closedTabsGroup1,
      ...newClosedTabs.map((tab) => ({ ...tab, closedAt: newClosedAt })),
    ]);
  });

  // TODO: add a test for changed userId and spaceId
});
