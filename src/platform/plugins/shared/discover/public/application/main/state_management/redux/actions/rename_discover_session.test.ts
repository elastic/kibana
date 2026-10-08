/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import { internalStateActions, selectHasUnsavedChanges } from '..';
import { TABS_LOCAL_STORAGE_KEY } from '../../tabs_storage_manager';

const setup = async ({
  isSaved = true,
  isSavedElsewhere = false,
  tabsStorageEnabled = false,
}: { isSaved?: boolean; isSavedElsewhere?: boolean; tabsStorageEnabled?: boolean } = {}) => {
  const services = createDiscoverServicesMock();
  services.storage = new Storage(localStorage);
  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewMock],
    tabsStorageEnabled,
  });
  const persistedDiscoverSession = createDiscoverSessionMock({
    id: 'test-session',
    title: 'Test Session',
    description: 'Test Description',
    tags: ['tag1'],
    tabs: [getPersistedTabMock({ tabId: 'test-tab', dataView: dataViewMock, services })],
  });

  await toolkit.initializeTabs({
    persistedDiscoverSession: isSaved ? persistedDiscoverSession : undefined,
  });
  await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

  // The latest saved version, which differs from the opened one when it was saved elsewhere since
  const latestDiscoverSession: DiscoverSession = isSavedElsewhere
    ? {
        ...persistedDiscoverSession,
        description: 'Description saved elsewhere',
        tags: ['tag2'],
        tabs: [
          ...persistedDiscoverSession.tabs,
          getPersistedTabMock({ tabId: 'tab-saved-elsewhere', dataView: dataViewMock, services }),
        ],
      }
    : persistedDiscoverSession;
  jest
    .mocked(services.discoverSessionService.get)
    .mockResolvedValue({ session: latestDiscoverSession, warnings: [] });

  // Opening the session already remembers it, so only track calls made after setup
  jest.mocked(services.chrome.recentlyAccessed.add).mockClear();

  return { toolkit, services, latestDiscoverSession };
};

describe('renameDiscoverSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should save the new title with the latest saved version, keeping changes saved elsewhere', async () => {
    const { toolkit, services, latestDiscoverSession } = await setup({ isSavedElsewhere: true });

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    expect(services.discoverSessionService.save).toHaveBeenCalledWith(
      {
        id: 'test-session',
        title: 'Renamed Session',
        description: 'Description saved elsewhere',
        tabs: latestDiscoverSession.tabs,
        tags: ['tag2'],
      },
      { copyOnSave: false }
    );
  });

  it('should only update the title of the opened session, leaving unsaved tab changes unsaved', async () => {
    const { toolkit, services } = await setup({ isSavedElsewhere: true });
    const openedDiscoverSession = toolkit.internalState.getState().persistedDiscoverSession;
    const tabId = toolkit.getCurrentTab().id;
    const comparisonContext = { runtimeStateManager: toolkit.runtimeStateManager, services };

    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({ tabId, appState: { columns: ['message'] } })
    );

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    expect(toolkit.internalState.getState().persistedDiscoverSession).toEqual({
      ...openedDiscoverSession,
      title: 'Renamed Session',
    });
    expect(toolkit.getCurrentTab().appState.columns).toEqual(['message']);
    expect(selectHasUnsavedChanges(toolkit.internalState.getState(), comparisonContext)).toEqual({
      hasUnsavedChanges: true,
      unsavedTabIds: [tabId],
    });
  });

  it('should store the version saved by the rename, so a reload keeps the local tabs', async () => {
    const { toolkit, services } = await setup({ tabsStorageEnabled: true });
    jest.mocked(services.discoverSessionService.save).mockImplementationOnce(async (session) => ({
      ...session,
      id: 'test-session',
      managed: false,
      version: 'renamed-version',
    }));

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    expect(toolkit.internalState.getState().persistedDiscoverSession?.version).toBe(
      'renamed-version'
    );
    await waitFor(() => {
      expect(services.storage.get(TABS_LOCAL_STORAGE_KEY).discoverSessionVersion).toBe(
        'renamed-version'
      );
    });
  });

  it('should add the renamed session to the recently accessed list', async () => {
    const { toolkit, services } = await setup();

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    expect(services.chrome.recentlyAccessed.add).toHaveBeenCalledTimes(1);
    expect(services.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
      '/app/discover#/view/test-session',
      'Renamed Session',
      'test-session'
    );
  });

  it('should reject and keep the persisted session when saving fails', async () => {
    const { toolkit, services } = await setup();
    const initialPersisted = toolkit.internalState.getState().persistedDiscoverSession;

    jest
      .mocked(services.discoverSessionService.save)
      .mockRejectedValueOnce(new Error('Save failed'));

    await expect(
      toolkit.internalState
        .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
        .unwrap()
    ).rejects.toHaveProperty('message', 'Save failed');

    expect(toolkit.internalState.getState().persistedDiscoverSession).toBe(initialPersisted);
    expect(services.chrome.recentlyAccessed.add).not.toHaveBeenCalled();
  });

  it('should reject without saving when the latest saved version cannot be loaded', async () => {
    const { toolkit, services } = await setup();
    const initialPersisted = toolkit.internalState.getState().persistedDiscoverSession;

    jest
      .mocked(services.discoverSessionService.get)
      .mockRejectedValueOnce(new Error('Session not found'));

    await expect(
      toolkit.internalState
        .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
        .unwrap()
    ).rejects.toHaveProperty('message', 'Session not found');

    expect(services.discoverSessionService.save).not.toHaveBeenCalled();
    expect(toolkit.internalState.getState().persistedDiscoverSession).toBe(initialPersisted);
  });

  it('should keep the title as a draft without saving when the session has never been saved', async () => {
    const { toolkit, services } = await setup({ isSaved: false });

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    expect(services.discoverSessionService.save).not.toHaveBeenCalled();
    expect(toolkit.internalState.getState().persistedDiscoverSession).toBeUndefined();
    expect(toolkit.internalState.getState().draftSessionTitle).toBe('Renamed Session');
  });

  it('should store the draft title together with the tabs of its own session', async () => {
    const { toolkit, services } = await setup({ isSaved: false, tabsStorageEnabled: true });
    const { spaceId } = toolkit.internalState.getState();
    const tabId = toolkit.getCurrentTab().id;

    // Once the session is stored, another Discover window replaces it with its own session
    await waitFor(() => {
      expect(services.storage.get(TABS_LOCAL_STORAGE_KEY)?.openTabs).toHaveLength(1);
    });
    services.storage.set(TABS_LOCAL_STORAGE_KEY, {
      userId: 'other-user',
      spaceId: 'other-space',
      openTabs: [{ id: 'other-window-tab', label: 'Other window tab' }],
      closedTabs: [],
    });

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    await waitFor(() => {
      expect(services.storage.get(TABS_LOCAL_STORAGE_KEY).draftSessionTitle).toBe(
        'Renamed Session'
      );
    });
    const storedTabsState = services.storage.get(TABS_LOCAL_STORAGE_KEY);
    expect(storedTabsState.spaceId).toBe(spaceId);
    expect(storedTabsState.openTabs).toHaveLength(1);
    expect(storedTabsState.openTabs[0].id).toBe(tabId);
  });
});
