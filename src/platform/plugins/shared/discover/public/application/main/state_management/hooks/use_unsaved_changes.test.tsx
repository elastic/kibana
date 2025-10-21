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
import type { DiscoverStateContainer } from '../discover_state';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import type { DiscoverServices } from '../../../../build_services';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import type { AppMountParameters } from '@kbn/core/public';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import React from 'react';
import {
  fromSavedSearchToSavedObjectTab,
  internalStateActions,
  selectAllTabs,
  selectHasUnsavedChanges,
  selectRecentlyClosedTabs,
} from '../redux';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import { getConnectedCustomizationService } from '../../../../customizations';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { AppLeaveActionFactory } from '@kbn/core-application-browser';

const mockSelectHasUnsavedChanges = jest.mocked(selectHasUnsavedChanges);

jest.mock('../redux/selectors', () => {
  const originalModule = jest.requireActual('../redux/selectors');
  return {
    ...originalModule,
    selectHasUnsavedChanges: jest.fn(originalModule.selectHasUnsavedChanges),
  };
});

describe('useUnsavedChanges', () => {
  const setup = async ({
    stateContainer = getDiscoverStateMock(),
    services = createDiscoverServicesMock(),
    onAppLeave,
  }: {
    stateContainer?: DiscoverStateContainer;
    services?: DiscoverServices;
    onAppLeave?: AppMountParameters['onAppLeave'];
  } = {}) => {
    const result = renderHook(useUnsavedChanges, {
      initialProps: {
        internalState: stateContainer.internalState,
        runtimeStateManager: stateContainer.runtimeStateManager,
        onAppLeave,
      },
      wrapper: ({ children }) => (
        <DiscoverTestProvider services={services} stateContainer={stateContainer}>
          {children}
        </DiscoverTestProvider>
      ),
    });
    return { result, stateContainer, services };
  };

  const changeTabs = async (stateContainer: DiscoverStateContainer) => {
    const newTab = getTabStateMock({ id: 'newTab' });
    await stateContainer.internalState.dispatch(
      internalStateActions.updateTabs({
        items: [newTab],
        selectedItem: newTab,
      })
    );
    stateContainer.internalState.dispatch(
      internalStateActions.setInitializationState({ hasESData: true, hasUserDataView: true })
    );
    await stateContainer.internalState.dispatch(
      internalStateActions.initializeSingleTab({
        tabId: newTab.id,
        initializeSingleTabParams: {
          stateContainer,
          customizationService: await getConnectedCustomizationService({
            customizationCallbacks: [],
            stateContainer,
          }),
          dataViewSpec: undefined,
          defaultUrlState: undefined,
        },
      })
    );
    return { newTab };
  };

  beforeEach(() => {
    mockSelectHasUnsavedChanges.mockClear();
  });

  it('should detect changes on mount', async () => {
    const { stateContainer, services } = await setup();
    expect(mockSelectHasUnsavedChanges).toHaveBeenCalledTimes(1);
    expect(mockSelectHasUnsavedChanges).toHaveBeenCalledWith(
      stateContainer.internalState.getState(),
      { runtimeStateManager: stateContainer.runtimeStateManager, services }
    );
    expect(stateContainer.internalState.getState().hasUnsavedChanges).toBe(false);
    expect(stateContainer.internalState.getState().tabs.unsavedIds).toEqual([]);
  });

  it('should detect changes when saved search changes', async () => {
    const { stateContainer } = await setup();
    expect(stateContainer.internalState.getState().hasUnsavedChanges).toBe(false);
    expect(stateContainer.internalState.getState().tabs.unsavedIds).toEqual([]);
    const savedSearch = stateContainer.savedSearchState.getState();
    stateContainer.savedSearchState.assignNextSavedSearch({
      ...savedSearch,
      columns: ['newColumn'],
    });
    expect(stateContainer.internalState.getState().hasUnsavedChanges).toBe(true);
    expect(stateContainer.internalState.getState().tabs.unsavedIds).toEqual([
      stateContainer.getCurrentTab().id,
    ]);
  });

  it('should detect changes when tabs change', async () => {
    const { stateContainer } = await setup();
    expect(stateContainer.internalState.getState().hasUnsavedChanges).toBe(false);
    expect(stateContainer.internalState.getState().tabs.unsavedIds).toEqual([]);
    const { newTab } = await changeTabs(stateContainer);
    expect(stateContainer.internalState.getState().hasUnsavedChanges).toBe(true);
    expect(stateContainer.internalState.getState().tabs.unsavedIds).toEqual([newTab.id]);
  });

  it('should detect changes when persisted discover session changes', async () => {
    const { stateContainer, services } = await setup();
    expect(stateContainer.internalState.getState().hasUnsavedChanges).toBe(false);
    expect(stateContainer.internalState.getState().tabs.unsavedIds).toEqual([]);
    const { newTab } = await changeTabs(stateContainer);
    expect(stateContainer.internalState.getState().hasUnsavedChanges).toBe(true);
    expect(stateContainer.internalState.getState().tabs.unsavedIds).toEqual([newTab.id]);
    const newDiscoverSession: DiscoverSession = {
      ...stateContainer.internalState.getState().persistedDiscoverSession!,
      tabs: [
        fromSavedSearchToSavedObjectTab({
          tab: newTab,
          savedSearch: stateContainer.savedSearchState.getState(),
          services,
        }),
      ],
    };
    const state = stateContainer.internalState.getState();
    stateContainer.internalState.dispatch(
      internalStateActions.setTabs({
        allTabs: selectAllTabs(state),
        selectedTabId: state.tabs.unsafeCurrentId,
        recentlyClosedTabs: selectRecentlyClosedTabs(state),
        updatedDiscoverSession: newDiscoverSession,
      })
    );
    expect(stateContainer.internalState.getState().hasUnsavedChanges).toBe(false);
    expect(stateContainer.internalState.getState().tabs.unsavedIds).toEqual([]);
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
