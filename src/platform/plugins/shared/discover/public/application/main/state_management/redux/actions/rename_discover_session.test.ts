/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  tabsStorageEnabled = false,
}: { isSaved?: boolean; tabsStorageEnabled?: boolean } = {}) => {
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

  // Opening the session already remembers it, so only track calls made after setup
  jest.mocked(services.chrome.recentlyAccessed.add).mockClear();

  return { toolkit, services, persistedDiscoverSession };
};

describe('renameDiscoverSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should save the new title with the persisted tabs, leaving unsaved tab changes unsaved', async () => {
    const { toolkit, services, persistedDiscoverSession } = await setup();
    const tabId = toolkit.getCurrentTab().id;
    const comparisonContext = { runtimeStateManager: toolkit.runtimeStateManager, services };

    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({ tabId, appState: { columns: ['message'] } })
    );

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    expect(services.discoverSessionService.save).toHaveBeenCalledWith(
      {
        id: 'test-session',
        title: 'Renamed Session',
        description: 'Test Description',
        tabs: persistedDiscoverSession.tabs,
        tags: ['tag1'],
      },
      { copyOnSave: false }
    );
    expect(toolkit.getCurrentTab().appState.columns).toEqual(['message']);
    expect(selectHasUnsavedChanges(toolkit.internalState.getState(), comparisonContext)).toEqual({
      hasUnsavedChanges: true,
      unsavedTabIds: [tabId],
    });
  });

  it('should update the persisted session and the recently accessed list', async () => {
    const { toolkit, services, persistedDiscoverSession } = await setup();

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    const expectedDiscoverSession: DiscoverSession = {
      id: 'test-session',
      title: 'Renamed Session',
      description: 'Test Description',
      tabs: persistedDiscoverSession.tabs,
      tags: ['tag1'],
      managed: false,
    };
    expect(toolkit.internalState.getState().persistedDiscoverSession).toEqual(
      expectedDiscoverSession
    );
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

  it('should keep the title as a draft without saving when the session has never been saved', async () => {
    const { toolkit, services } = await setup({ isSaved: false, tabsStorageEnabled: true });

    await toolkit.internalState
      .dispatch(internalStateActions.renameDiscoverSession({ newTitle: 'Renamed Session' }))
      .unwrap();

    expect(services.discoverSessionService.save).not.toHaveBeenCalled();
    expect(toolkit.internalState.getState().persistedDiscoverSession).toBeUndefined();
    expect(toolkit.internalState.getState().draftSessionTitle).toBe('Renamed Session');
    expect(services.storage.get(TABS_LOCAL_STORAGE_KEY).draftSessionTitle).toBe('Renamed Session');
  });
});
