/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { createKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import {
  createTabsStorageManager,
  TABS_LOCAL_STORAGE_KEY,
  type TabsInternalStatePayload,
} from './tabs_storage_manager';
import type { RecentlyClosedTabState, TabState } from './redux/types';
import { TAB_STATE_URL_KEY } from '../../../../common/constants';
import { DEFAULT_TAB_STATE, fromSavedSearchToSavedObjectTab } from './redux';
import {
  getRecentlyClosedTabStateMock,
  getTabStateMock,
} from './redux/__mocks__/internal_state.mocks';
import { savedSearchMock } from '../../../__mocks__/saved_search';

const mockUserId = 'testUserId';
const mockSpaceId = 'testSpaceId';

const mockGetAppState = (tabId: string) => {
  if (tabId === 'tab1') {
    return {
      columns: ['a', 'b'],
    };
  }

  if (tabId === 'tab2') {
    return {
      columns: ['c', 'd'],
    };
  }

  if (tabId.startsWith('closedTab')) {
    return {
      columns: ['e', 'f'],
    };
  }
};

const mockGetInternalState = () => ({});

const mockTab1 = getTabStateMock({
  id: 'tab1',
  label: 'Tab 1',
  globalState: {
    timeRange: { from: '2025-04-16T14:07:55.127Z', to: '2025-04-16T14:12:55.127Z' },
    filters: [],
    refreshInterval: { pause: true, value: 1000 },
  },
});

const mockTab2 = getTabStateMock({
  id: 'tab2',
  label: 'Tab 2',
  globalState: {
    timeRange: { from: '2025-04-17T03:07:55.127Z', to: '2025-04-17T03:12:55.127Z' },
    filters: [],
    refreshInterval: { pause: true, value: 1000 },
  },
});

const mockRecentlyClosedTab = getRecentlyClosedTabStateMock({
  id: 'closedTab1',
  label: 'Closed tab 1',
  globalState: {
    timeRange: { from: '2025-04-07T03:07:55.127Z', to: '2025-04-07T03:12:55.127Z' },
    filters: [],
    refreshInterval: { pause: true, value: 1000 },
  },
  closedAt: Date.now(),
});

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
    services.storage = new Storage(localStorage);

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
    internalState: mockGetInternalState(),
    appState: mockGetAppState(tab.id),
    globalState: tab.globalState,
    ...('closedAt' in tab ? { closedAt: tab.closedAt } : {}),
  });

  const toRestoredTab = (storedTab: TabState | RecentlyClosedTabState) => ({
    ...DEFAULT_TAB_STATE,
    id: storedTab.id,
    label: storedTab.label,
    initialAppState: mockGetAppState(storedTab.id),
    globalState: storedTab.globalState,
    ...('closedAt' in storedTab ? { closedAt: storedTab.closedAt } : {}),
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
      defaultTabState: DEFAULT_TAB_STATE,
    });

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const props: TabsInternalStatePayload = {
      allTabs: [mockTab1, mockTab2],
      selectedTabId: 'tab1',
      recentlyClosedTabs: [mockRecentlyClosedTab],
    };

    await tabsStorageManager.persistLocally(props, mockGetAppState, mockGetInternalState);

    expect(urlStateStorage.set).toHaveBeenCalledWith(
      TAB_STATE_URL_KEY,
      { tabId: 'tab1' },
      { replace: false }
    );
    expect(storage.set).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });
  });

  it('should load tabs state from local storage and select one of open tabs', () => {
    const {
      tabsStorageManager,
      urlStateStorage,
      services: { storage },
    } = create();
    jest.spyOn(urlStateStorage, 'get');
    jest.spyOn(storage, 'get');

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, {
      tabId: 'tab2',
    });

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps).toEqual({
      allTabs: [toRestoredTab(mockTab1), toRestoredTab(mockTab2)],
      selectedTabId: 'tab2',
      recentlyClosedTabs: [toRestoredTab(mockRecentlyClosedTab)],
    });
    expect(urlStateStorage.get).toHaveBeenCalledWith(TAB_STATE_URL_KEY);
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

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [
        toStoredTab(mockRecentlyClosedTab),
        toStoredTab(mockRecentlyClosedTab2),
        toStoredTab(mockRecentlyClosedTab3),
      ],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, {
      tabId: mockRecentlyClosedTab2.id,
    });

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps).toEqual({
      allTabs: [
        toRestoredTab(omit(mockRecentlyClosedTab, 'closedAt')),
        toRestoredTab(omit(mockRecentlyClosedTab2, 'closedAt')),
      ],
      selectedTabId: mockRecentlyClosedTab2.id,
      recentlyClosedTabs: [
        toRestoredTab({ ...mockTab1, closedAt: newClosedAt }),
        toRestoredTab({ ...mockTab2, closedAt: newClosedAt }),
        toRestoredTab(mockRecentlyClosedTab3),
        toRestoredTab(mockRecentlyClosedTab),
        toRestoredTab(mockRecentlyClosedTab2),
      ],
    });
    expect(urlStateStorage.get).toHaveBeenCalledWith(TAB_STATE_URL_KEY);
    expect(storage.get).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY);
    expect(urlStateStorage.set).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should initialize with a default state if user id changes', () => {
    const {
      tabsStorageManager,
      urlStateStorage,
      services: { storage },
    } = create();
    jest.spyOn(urlStateStorage, 'get');
    jest.spyOn(storage, 'get');

    const props: TabsInternalStatePayload = {
      allTabs: [mockTab1, mockTab2],
      selectedTabId: 'tab2',
      recentlyClosedTabs: [mockRecentlyClosedTab],
    };

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, {
      tabId: props.selectedTabId,
    });

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const loadedProps = tabsStorageManager.loadLocally({
      userId: 'different',
      spaceId: mockSpaceId,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps.recentlyClosedTabs).toHaveLength(0);
    expect(loadedProps.allTabs).toHaveLength(1);
    expect(loadedProps.allTabs[0]).toEqual(
      expect.objectContaining({
        label: 'Untitled',
      })
    );
    expect(loadedProps.selectedTabId).toBe(loadedProps.allTabs[0].id);
    expect(urlStateStorage.get).toHaveBeenCalledWith(TAB_STATE_URL_KEY);
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

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, null);

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps).toEqual(
      expect.objectContaining({
        recentlyClosedTabs: [
          toRestoredTab({ ...mockTab1, closedAt: newClosedAt }),
          toRestoredTab({ ...mockTab2, closedAt: newClosedAt }),
          toRestoredTab(mockRecentlyClosedTab),
        ],
      })
    );
    expect(loadedProps.allTabs).toHaveLength(1);
    expect(loadedProps.allTabs[0]).toEqual(
      expect.objectContaining({
        label: 'Untitled',
      })
    );
    expect(loadedProps.selectedTabId).toBe(loadedProps.allTabs[0].id);
    expect(urlStateStorage.get).toHaveBeenCalledWith(TAB_STATE_URL_KEY);
    expect(storage.get).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY);
    expect(urlStateStorage.set).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should update tab state in local storage', () => {
    const { tabsStorageManager, services } = create();
    const storage = services.storage;

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    jest.spyOn(storage, 'set');

    const updatedTabState = {
      internalState: {},
      appState: {
        columns: ['a', 'b', 'c'],
      },
      globalState: {
        refreshInterval: { pause: false, value: 300 },
      },
    };

    tabsStorageManager.updateTabStateLocally(mockTab1.id, updatedTabState);

    expect(storage.set).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [
        {
          ...toStoredTab(mockTab1),
          ...updatedTabState,
        },
        toStoredTab(mockTab2),
      ],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });
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

  it('should update discover session id in local storage', () => {
    const {
      tabsStorageManager,
      services: { storage },
    } = create();

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
      discoverSessionId: undefined,
    });

    jest.spyOn(storage, 'set');

    const newDiscoverSessionId = 'session-123';
    tabsStorageManager.updateDiscoverSessionIdLocally(newDiscoverSessionId);

    expect(storage.set).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      discoverSessionId: newDiscoverSessionId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });
  });

  it('should not update discover session id when disabled', () => {
    const urlStateStorage = createKbnUrlStateStorage();
    const services = createDiscoverServicesMock();
    services.storage = new Storage(localStorage);
    const storage = services.storage;

    const tabsStorageManager = createTabsStorageManager({
      urlStateStorage,
      storage,
      enabled: false,
    });

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [],
      closedTabs: [],
    });

    jest.spyOn(storage, 'set');

    tabsStorageManager.updateDiscoverSessionIdLocally('session-123');

    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should load open tabs from storage when persisted discover session id matches stored session id', () => {
    const {
      tabsStorageManager,
      urlStateStorage,
      services: { storage },
    } = create();

    const matchingSessionId = 'session-match';

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      discoverSessionId: matchingSessionId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, {
      tabId: mockTab2.id,
    });

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      persistedDiscoverSession: {
        id: matchingSessionId,
        title: 'title',
        description: 'description',
        managed: false,
        tabs: [],
      },
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps).toEqual({
      allTabs: [toRestoredTab(mockTab1), toRestoredTab(mockTab2)],
      selectedTabId: mockTab2.id,
      recentlyClosedTabs: [toRestoredTab(mockRecentlyClosedTab)],
    });
  });

  it('should load persisted tabs when persisted discover session id differs from stored session id', () => {
    const { tabsStorageManager, urlStateStorage, services } = create();
    const { storage } = services;

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      discoverSessionId: undefined,
      openTabs: [toStoredTab(mockTab1)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, {
      tabId: mockTab1.id,
    });

    const persistedTabId = 'persisted-tab';
    const peristedTab = fromSavedSearchToSavedObjectTab({
      tab: { id: persistedTabId, label: 'Persisted tab' },
      savedSearch: savedSearchMock,
      services,
    });
    const persistedDiscoverSession = {
      id: 'persisted-session',
      title: 'title',
      description: 'description',
      managed: false,
      tabs: [peristedTab],
    };

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      persistedDiscoverSession,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps.allTabs.map((t) => t.id)).toEqual([persistedTabId]);
    expect(loadedProps.selectedTabId).toBe(persistedTabId);
    expect(loadedProps.allTabs.find((t) => t.id === mockTab1.id)).toBeUndefined();
  });

  it('should load persisted tabs when persisted discover session id matches stored session id, but target open tab is not found', () => {
    const { tabsStorageManager, urlStateStorage, services } = create();
    const { storage } = services;

    const persistedSessionId = 'persisted-session';

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      discoverSessionId: persistedSessionId,
      openTabs: [toStoredTab(mockTab1)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, {
      tabId: 'bad-tab',
    });

    const persistedTabId = 'persisted-tab';
    const peristedTab = fromSavedSearchToSavedObjectTab({
      tab: { id: persistedTabId, label: 'Persisted tab' },
      savedSearch: savedSearchMock,
      services,
    });
    const persistedDiscoverSession = {
      id: persistedSessionId,
      title: 'title',
      description: 'description',
      managed: false,
      tabs: [peristedTab],
    };

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      persistedDiscoverSession,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps.allTabs.map((t) => t.id)).toEqual([persistedTabId]);
    expect(loadedProps.selectedTabId).toBe(persistedTabId);
    expect(loadedProps.allTabs.find((t) => t.id === mockTab1.id)).toBeUndefined();
  });

  it('should not load from recently closed tabs when a persisted discover session is provided', () => {
    const { tabsStorageManager, urlStateStorage, services } = create();
    const { storage } = services;

    const persistedSessionId = 'persisted-session';

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      discoverSessionId: persistedSessionId,
      openTabs: [toStoredTab(mockTab1)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, {
      tabId: mockRecentlyClosedTab.id,
    });

    const persistedTabId = 'persisted-tab';
    const peristedTab = fromSavedSearchToSavedObjectTab({
      tab: { id: persistedTabId, label: 'Persisted tab' },
      savedSearch: savedSearchMock,
      services,
    });
    const persistedDiscoverSession = {
      id: persistedSessionId,
      title: 'title',
      description: 'description',
      managed: false,
      tabs: [peristedTab],
    };

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      persistedDiscoverSession,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps.allTabs.map((t) => t.id)).toEqual([persistedTabId]);
    expect(loadedProps.selectedTabId).toBe(persistedTabId);
    expect(loadedProps.allTabs.find((t) => t.id === mockTab1.id)).toBeUndefined();
  });

  it('should load tabs state from local storage and append a new tab', () => {
    const {
      tabsStorageManager,
      urlStateStorage,
      services: { storage },
    } = create();
    jest.spyOn(urlStateStorage, 'get');
    jest.spyOn(storage, 'get');

    storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: mockUserId,
      spaceId: mockSpaceId,
      openTabs: [toStoredTab(mockTab1), toStoredTab(mockTab2)],
      closedTabs: [toStoredTab(mockRecentlyClosedTab)],
    });

    urlStateStorage.set(TAB_STATE_URL_KEY, {
      tabId: 'new',
      tabLabel: 'New tab test',
    });

    jest.spyOn(urlStateStorage, 'set');
    jest.spyOn(storage, 'set');

    const loadedProps = tabsStorageManager.loadLocally({
      userId: mockUserId,
      spaceId: mockSpaceId,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    expect(loadedProps.recentlyClosedTabs).toEqual([toRestoredTab(mockRecentlyClosedTab)]);
    expect(loadedProps.allTabs).toHaveLength(3);
    expect(loadedProps.allTabs[0]).toEqual(toRestoredTab(mockTab1));
    expect(loadedProps.allTabs[1]).toEqual(toRestoredTab(mockTab2));
    expect(loadedProps.allTabs[2]).toEqual(
      expect.objectContaining({
        label: 'New tab test',
      })
    );
    expect(loadedProps.selectedTabId).toBe(loadedProps.allTabs[2].id);
    expect(urlStateStorage.get).toHaveBeenCalledWith(TAB_STATE_URL_KEY);
    expect(storage.get).toHaveBeenCalledWith(TABS_LOCAL_STORAGE_KEY);
    expect(urlStateStorage.set).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });
});
