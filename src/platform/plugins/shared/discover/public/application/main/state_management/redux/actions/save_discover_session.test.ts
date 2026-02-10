/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../../__mocks__/discover_state.mock';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverServices } from '../../../../../build_services';
import type { SaveDiscoverSessionParams, SavedSearch } from '@kbn/saved-search-plugin/public';
import { internalStateActions } from '..';
import { savedSearchMock } from '../../../../../__mocks__/saved_search';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { internalStateSlice } from '../internal_state';
import type { SaveDiscoverSessionThunkParams } from './save_discover_session';
import * as tabStateDataViewActions from './tab_state_data_view';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid') }));

const getSaveDiscoverSessionParams = (
  overrides: Partial<SaveDiscoverSessionThunkParams> = {}
): SaveDiscoverSessionThunkParams => ({
  newTitle: 'new title',
  newCopyOnSave: false,
  newTimeRestore: false,
  newDescription: 'new description',
  newTags: [],
  isTitleDuplicateConfirmed: false,
  onTitleDuplicate: jest.fn(),
  ...overrides,
});

const setup = ({
  additionalPersistedTabs,
}: {
  additionalPersistedTabs?: (services: DiscoverServices) => DiscoverSessionTab[];
} = {}) => {
  const services = createDiscoverServicesMock();
  const saveDiscoverSessionSpy = jest
    .spyOn(services.savedSearch, 'saveDiscoverSession')
    .mockImplementation((discoverSession) =>
      Promise.resolve({
        ...discoverSession,
        id: discoverSession.id ?? 'new-session',
        managed: false,
      })
    );
  const dataViewCreateSpy = jest.spyOn(services.dataViews, 'create');
  const dataViewsClearCacheSpy = jest.spyOn(services.dataViews, 'clearInstanceCache');
  const savedSearch: SavedSearch = {
    ...savedSearchMock,
    chartInterval: 'auto',
    timeRestore: false,
  };
  savedSearch.searchSource.setField('filter', []);
  const state = getDiscoverStateMock({
    savedSearch,
    additionalPersistedTabs: additionalPersistedTabs?.(services),
    services,
  });

  return {
    state,
    services,
    saveDiscoverSessionSpy,
    dataViewCreateSpy,
    dataViewsClearCacheSpy,
  };
};

describe('saveDiscoverSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call saveDiscoverSession with the expected params', async () => {
    const { state, saveDiscoverSessionSpy } = setup({
      additionalPersistedTabs: (services) => [
        fromTabStateToSavedObjectTab({
          tab: getTabStateMock({
            id: 'test-tab',
            initialInternalState: {
              serializedSearchSource: { index: dataViewMock.id },
            },
          }),
          timeRestore: false,
          services,
        }),
      ],
    });
    const discoverSession = state.internalState.getState().persistedDiscoverSession;
    const onTitleDuplicate = jest.fn();

    await state.internalState.dispatch(
      internalStateActions.saveDiscoverSession(
        getSaveDiscoverSessionParams({ newTags: ['tag1', 'tag2'], onTitleDuplicate })
      )
    );

    const updatedDiscoverSession: SaveDiscoverSessionParams = {
      id: discoverSession?.id,
      title: 'new title',
      description: 'new description',
      tabs: discoverSession?.tabs ?? [],
      tags: ['tag1', 'tag2'],
    };

    expect(saveDiscoverSessionSpy).toHaveBeenCalledWith(updatedDiscoverSession, {
      onTitleDuplicate,
      copyOnSave: false,
      isTitleDuplicateConfirmed: false,
    });

    expect(state.internalState.getState().persistedDiscoverSession).toEqual({
      ...updatedDiscoverSession,
      managed: false,
    });
  });

  it('should update runtime state for applicable tabs', async () => {
    const { state, services, saveDiscoverSessionSpy } = setup();

    state.savedSearchState.assignNextSavedSearch({
      ...state.savedSearchState.getState(),
      breakdownField: 'breakdown-test',
    });

    const resetOnSavedSearchChangeSpy = jest.spyOn(
      internalStateSlice.actions,
      'resetOnSavedSearchChange'
    );
    const setDataViewSpy = jest.spyOn(tabStateDataViewActions, 'setDataView');
    const setSavedSearchSpy = jest.spyOn(state.savedSearchState, 'set');
    const currentTabId = state.getCurrentTab().id;

    jest
      .spyOn(services.data.search.searchSource, 'create')
      .mockResolvedValue(createSearchSourceMock({ index: dataViewMockWithTimeField }));

    await state.internalState.dispatch(
      internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams())
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();
    expect(resetOnSavedSearchChangeSpy).toHaveBeenCalledWith({ tabId: currentTabId });
    expect(setDataViewSpy).toHaveBeenCalledWith({
      tabId: currentTabId,
      dataView: dataViewMockWithTimeField,
    });
    expect(setSavedSearchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ breakdownField: 'breakdown-test' })
    );
  });

  it('should not update local state if saveDiscoverSession returns undefined', async () => {
    const { state, saveDiscoverSessionSpy } = setup();
    const resetOnSavedSearchChangeSpy = jest.spyOn(
      internalStateSlice.actions,
      'resetOnSavedSearchChange'
    );
    const initialPersisted = state.internalState.getState().persistedDiscoverSession;

    saveDiscoverSessionSpy.mockResolvedValueOnce(undefined);

    await state.internalState.dispatch(
      internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams())
    );

    expect(state.internalState.getState().persistedDiscoverSession).toBe(initialPersisted);
    expect(resetOnSavedSearchChangeSpy).not.toHaveBeenCalled();
  });

  it('should allow errors thrown at the persistence layer to bubble up and not modify local state', async () => {
    const { state, saveDiscoverSessionSpy } = setup();
    const resetOnSavedSearchChangeSpy = jest.spyOn(
      internalStateSlice.actions,
      'resetOnSavedSearchChange'
    );
    const initialPersisted = state.internalState.getState().persistedDiscoverSession;

    saveDiscoverSessionSpy.mockRejectedValueOnce(new Error('boom'));

    await expect(
      state.internalState
        .dispatch(internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams()))
        .unwrap()
    ).rejects.toHaveProperty('message', 'boom');

    expect(state.internalState.getState().persistedDiscoverSession).toBe(initialPersisted);
    expect(resetOnSavedSearchChangeSpy).not.toHaveBeenCalled();
  });

  it('should include timeRange and refreshInterval when timeRestore is true', async () => {
    const { state, saveDiscoverSessionSpy } = setup({
      additionalPersistedTabs: (services) => [
        fromTabStateToSavedObjectTab({
          tab: getTabStateMock({
            id: 'time-tab',
            globalState: {
              timeRange: { from: 'now-15m', to: 'now' },
              refreshInterval: { value: 10000, pause: false },
            },
            initialInternalState: {
              serializedSearchSource: { index: dataViewMock.id },
            },
          }),
          timeRestore: true,
          services,
        }),
      ],
    });

    await state.internalState.dispatch(
      internalStateActions.saveDiscoverSession(
        getSaveDiscoverSessionParams({ newTimeRestore: true })
      )
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();

    const tabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs;
    const savedTimeTab = tabs.find((t) => t.id === 'time-tab');

    expect(savedTimeTab?.timeRestore).toBe(true);
    expect(savedTimeTab?.timeRange).toEqual({ from: 'now-15m', to: 'now' });
    expect(savedTimeTab?.refreshInterval).toEqual({ value: 10000, pause: false });
  });

  it('should replace custom ad hoc data view when copying on save', async () => {
    const oldId = 'adhoc-id';
    const filters = [
      { meta: { index: oldId, alias: null, disabled: false }, query: { match_all: {} } },
    ];
    const { state, saveDiscoverSessionSpy, dataViewCreateSpy, dataViewsClearCacheSpy } = setup({
      additionalPersistedTabs: (services) => [
        fromTabStateToSavedObjectTab({
          tab: getTabStateMock({
            id: 'adhoc-replace-tab',
            initialInternalState: {
              serializedSearchSource: {
                index: { id: oldId, title: 'Adhoc', name: 'Adhoc Name' },
                filter: filters,
              },
            },
          }),
          timeRestore: false,
          services,
        }),
      ],
    });

    await state.internalState.dispatch(
      internalStateActions.saveDiscoverSession(
        getSaveDiscoverSessionParams({ newCopyOnSave: true })
      )
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();
    expect(dataViewCreateSpy).toHaveBeenCalled();
    expect(dataViewsClearCacheSpy).toHaveBeenCalledWith(oldId);

    const createdSpec = dataViewCreateSpy.mock.calls[0][0];
    expect(createdSpec.id).toBe('test-uuid');
    expect(createdSpec.name).toBe('Adhoc Name');

    const tabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs;
    expect(tabs).toHaveLength(2);
    const savedTab = tabs[1];
    expect(savedTab?.id).toBe('test-uuid');
    expect((savedTab?.serializedSearchSource?.index as DataViewSpec).id).toBe('test-uuid');
    expect(savedTab?.serializedSearchSource?.filter?.[0].meta.index).toBe('test-uuid');
  });

  it('should copy default profile ad hoc data view on save', async () => {
    const defaultProfileId = 'default-profile-id';
    const filters = [
      { meta: { index: defaultProfileId, alias: null, disabled: false }, query: { match_all: {} } },
    ];
    const { state, saveDiscoverSessionSpy, dataViewCreateSpy, dataViewsClearCacheSpy } = setup({
      additionalPersistedTabs: (services) => [
        fromTabStateToSavedObjectTab({
          tab: getTabStateMock({
            id: 'adhoc-copy-tab',
            initialInternalState: {
              serializedSearchSource: {
                index: { id: defaultProfileId, title: 'Adhoc', name: 'Adhoc Name' },
                filter: filters,
              },
            },
          }),
          timeRestore: false,
          services,
        }),
      ],
    });

    state.internalState.dispatch(
      internalStateSlice.actions.setDefaultProfileAdHocDataViewIds([defaultProfileId])
    );

    await state.internalState.dispatch(
      internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams())
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();
    expect(dataViewCreateSpy).toHaveBeenCalled();
    expect(dataViewsClearCacheSpy).not.toHaveBeenCalled();

    const createdSpec = dataViewCreateSpy.mock.calls[0][0];
    expect(createdSpec.id).toBe('test-uuid');
    expect(createdSpec.name).toBe('Adhoc Name (new title)');

    const tabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs;
    const savedTab = tabs.find((t) => t.id === 'adhoc-copy-tab');

    expect((savedTab?.serializedSearchSource?.index as DataViewSpec).id).toBe('test-uuid');
    expect(savedTab?.serializedSearchSource?.filter?.[0].meta.index).toBe('test-uuid');
  });

  it('should not clone ad hoc ES|QL data views', async () => {
    const esqlId = 'adhoc-esql-id';
    const { state, saveDiscoverSessionSpy, dataViewCreateSpy, dataViewsClearCacheSpy } = setup({
      additionalPersistedTabs: (services) => [
        fromTabStateToSavedObjectTab({
          tab: getTabStateMock({
            id: 'esql-tab',
            initialInternalState: {
              serializedSearchSource: {
                index: { id: esqlId, title: 'ES|QL Adhoc', type: ESQL_TYPE },
              },
            },
          }),
          timeRestore: false,
          services,
        }),
      ],
    });

    await state.internalState.dispatch(
      internalStateActions.saveDiscoverSession(
        getSaveDiscoverSessionParams({ newCopyOnSave: true })
      )
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();
    expect(dataViewCreateSpy).not.toHaveBeenCalled();
    expect(dataViewsClearCacheSpy).not.toHaveBeenCalled();

    const tabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs;
    expect(tabs).toHaveLength(2);

    const savedTab = tabs[1];
    expect(savedTab?.id).toBe('test-uuid');
    expect((savedTab?.serializedSearchSource.index as DataViewSpec).id).toBe(esqlId);
  });

  it('should apply overriddenVisContextAfterInvalidation to the saved tab', async () => {
    const { state, saveDiscoverSessionSpy } = setup({
      additionalPersistedTabs: (services) => [
        fromTabStateToSavedObjectTab({
          tab: getTabStateMock({
            id: 'vis-context-tab',
            initialInternalState: {
              serializedSearchSource: { index: dataViewMock.id },
            },
          }),
          timeRestore: false,
          services,
        }),
      ],
    });
    const visContext = { foo: 'bar' };

    state.internalState.dispatch(
      internalStateActions.setOverriddenVisContextAfterInvalidation({
        tabId: 'vis-context-tab',
        overriddenVisContextAfterInvalidation: visContext,
      })
    );

    await state.internalState.dispatch(
      internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams())
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();

    const tabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs;
    const savedTab = tabs.find((t) => t.id === 'vis-context-tab');

    expect(savedTab?.visContext).toEqual(visContext);
  });
});
