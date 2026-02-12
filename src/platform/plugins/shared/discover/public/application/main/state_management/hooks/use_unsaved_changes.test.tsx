/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useUnsavedChanges } from './use_unsaved_changes';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import type { DiscoverServices } from '../../../../build_services';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import type { AppMountParameters } from '@kbn/core/public';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import React from 'react';
import { fromTabStateToSavedObjectTab, selectHasUnsavedChanges } from '../redux';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import type { AppLeaveActionFactory } from '@kbn/core-application-browser';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';

const mockSelectHasUnsavedChanges = jest.mocked(selectHasUnsavedChanges);

jest.mock('../redux/selectors', () => {
  const originalModule = jest.requireActual('../redux/selectors');
  return {
    ...originalModule,
    selectHasUnsavedChanges: jest.fn(originalModule.selectHasUnsavedChanges),
  };
});

describe('useUnsavedChanges', () => {
  const getPersistedDiscoverSession = ({ services }: { services: DiscoverServices }) => {
    const persistedTab = fromTabStateToSavedObjectTab({
      tab: getTabStateMock({
        id: 'persisted-tab',
        initialInternalState: {
          serializedSearchSource: { index: dataViewWithTimefieldMock.id },
        },
      }),
      services,
    });

    return createDiscoverSessionMock({
      id: 'test-id',
      tabs: [persistedTab],
    });
  };

  const setup = async ({
    services = createDiscoverServicesMock(),
    onAppLeave,
  }: {
    services?: DiscoverServices;
    onAppLeave?: AppMountParameters['onAppLeave'];
  } = {}) => {
    const {
      internalState,
      runtimeStateManager,
      initializeTabs,
      initializeSingleTab,
      getCurrentTab,
      addNewTab,
      saveDiscoverSession,
    } = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMock, dataViewWithTimefieldMock],
    });

    await initializeTabs({ persistedDiscoverSession: getPersistedDiscoverSession({ services }) });

    const { stateContainer } = await initializeSingleTab({ tabId: getCurrentTab().id });

    const result = renderHook(useUnsavedChanges, {
      initialProps: { internalState, runtimeStateManager, onAppLeave },
      wrapper: ({ children }) => (
        <DiscoverTestProvider services={services} stateContainer={stateContainer}>
          {children}
        </DiscoverTestProvider>
      ),
    });

    return {
      result,
      internalState,
      runtimeStateManager,
      stateContainer,
      services,
      initializeTabs,
      initializeSingleTab,
      addNewTab,
      getCurrentTab,
      saveDiscoverSession,
    };
  };

  const newTab = getTabStateMock({ id: 'newTab' });

  beforeEach(() => {
    mockSelectHasUnsavedChanges.mockClear();
  });

  it('should detect changes on mount', async () => {
    const { internalState, runtimeStateManager, services } = await setup();
    expect(mockSelectHasUnsavedChanges).toHaveBeenCalledTimes(1);
    expect(mockSelectHasUnsavedChanges).toHaveBeenCalledWith(internalState.getState(), {
      runtimeStateManager,
      services,
    });
    expect(internalState.getState().hasUnsavedChanges).toBe(false);
    expect(internalState.getState().tabs.unsavedIds).toEqual([]);
  });

  it('should detect changes when saved search changes', async () => {
    const { internalState, stateContainer, getCurrentTab } = await setup();
    expect(internalState.getState().hasUnsavedChanges).toBe(false);
    expect(internalState.getState().tabs.unsavedIds).toEqual([]);
    const savedSearch = stateContainer.savedSearchState.getState();
    stateContainer.savedSearchState.assignNextSavedSearch({
      ...savedSearch,
      columns: ['newColumn'],
    });
    expect(internalState.getState().hasUnsavedChanges).toBe(true);
    expect(internalState.getState().tabs.unsavedIds).toEqual([getCurrentTab().id]);
  });

  it('should detect changes when tabs change', async () => {
    const { internalState, initializeSingleTab, addNewTab } = await setup();
    expect(internalState.getState().hasUnsavedChanges).toBe(false);
    expect(internalState.getState().tabs.unsavedIds).toEqual([]);
    await addNewTab({ tab: newTab });
    await initializeSingleTab({ tabId: newTab.id });
    expect(internalState.getState().hasUnsavedChanges).toBe(true);
    expect(internalState.getState().tabs.unsavedIds).toEqual([newTab.id]);
  });

  it('should detect changes when persisted discover session changes', async () => {
    const { internalState, initializeSingleTab, addNewTab, saveDiscoverSession } = await setup();
    expect(internalState.getState().hasUnsavedChanges).toBe(false);
    expect(internalState.getState().tabs.unsavedIds).toEqual([]);
    await addNewTab({ tab: newTab });
    await initializeSingleTab({ tabId: newTab.id });
    expect(internalState.getState().hasUnsavedChanges).toBe(true);
    expect(internalState.getState().tabs.unsavedIds).toEqual([newTab.id]);
    await saveDiscoverSession();
    expect(internalState.getState().hasUnsavedChanges).toBe(false);
    expect(internalState.getState().tabs.unsavedIds).toEqual([]);
  });

  it('should call the onAppLeave default action when there are no unsaved changes', async () => {
    let onAppLeaveCallback: (actions: AppLeaveActionFactory) => void = () => {};
    const onAppLeave = jest.fn().mockImplementation((callback: typeof onAppLeaveCallback) => {
      onAppLeaveCallback = callback;
    });
    await setup({ onAppLeave });
    const defaultFn = jest.fn();
    const confirmFn = jest.fn();
    onAppLeaveCallback({
      default: defaultFn,
      confirm: confirmFn,
    });
    expect(defaultFn).toHaveBeenCalledTimes(1);
    expect(confirmFn).not.toHaveBeenCalled();
  });

  it('should call the onAppLeave confirm action when there are unsaved changes', async () => {
    let onAppLeaveCallback: (actions: AppLeaveActionFactory) => void = () => {};
    const onAppLeave = jest.fn().mockImplementation((callback: typeof onAppLeaveCallback) => {
      onAppLeaveCallback = callback;
    });
    const { stateContainer } = await setup({ onAppLeave });
    const savedSearch = stateContainer.savedSearchState.getState();
    stateContainer.savedSearchState.assignNextSavedSearch({
      ...savedSearch,
      columns: ['newColumn'],
    });
    const defaultFn = jest.fn();
    const confirmFn = jest.fn();
    onAppLeaveCallback({
      default: defaultFn,
      confirm: confirmFn,
    });
    expect(defaultFn).not.toHaveBeenCalled();
    expect(confirmFn).toHaveBeenCalledTimes(1);
  });
});
