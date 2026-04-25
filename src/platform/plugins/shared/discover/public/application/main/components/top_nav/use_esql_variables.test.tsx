/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ControlGroupRendererApi, ControlPanelsState } from '@kbn/control-group-renderer';
import { BehaviorSubject, Observable, skip } from 'rxjs';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { mockControlState } from '../../../../__mocks__/esql_controls';
import { useESQLVariables } from './use_esql_variables';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { internalStateActions } from '../../state_management/redux';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { InternalStateMockToolkit } from '../../../../__mocks__/discover_state.mock';

// Mock ControlGroupRendererApi
class MockControlGroupRendererApi {
  inputSubject: BehaviorSubject<{
    initialChildControlState: ControlPanelsState<OptionsListESQLControlState>;
  } | null>;
  esqlVariables$: BehaviorSubject<ESQLControlVariable[]>;
  addNewPanel: jest.Mock;

  constructor() {
    this.inputSubject = new BehaviorSubject<{
      initialChildControlState: ControlPanelsState<OptionsListESQLControlState>;
    } | null>(null);
    this.esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
    this.addNewPanel = jest.fn();
  }

  getInput() {
    return this.inputSubject.getValue();
  }

  getInput$() {
    return this.inputSubject.asObservable().pipe(skip(1));
  }

  // Method to simulate new input coming from the API
  simulateInput(input: {
    initialChildControlState: ControlPanelsState<OptionsListESQLControlState>;
  }) {
    this.inputSubject.next(input);
  }

  // Method to simulate variable changes from the control manager
  simulateVariables(variables: ESQLControlVariable[]) {
    this.esqlVariables$.next(variables);
  }

  updateInput = jest.fn().mockImplementation(() => {
    throw new Error('Should not be called');
  });
}

// --- Test Suite ---
describe('useESQLVariables', () => {
  let mockControlGroupAPI: MockControlGroupRendererApi;

  const setup = async () => {
    const toolkit = getDiscoverInternalStateMock();
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });
    return { toolkit };
  };

  const renderUseESQLVariables = async ({
    toolkit,
    isEsqlMode = true,
    controlGroupApi = mockControlGroupAPI as unknown as ControlGroupRendererApi,
    currentEsqlVariables = [],
    onUpdateESQLQuery = jest.fn(),
  }: {
    toolkit?: InternalStateMockToolkit;
    isEsqlMode?: boolean;
    controlGroupApi?: ControlGroupRendererApi;
    currentEsqlVariables?: ESQLControlVariable[];
    onUpdateESQLQuery?: (query: string) => void;
  }) => {
    toolkit ??= (await setup()).toolkit;

    const hook = renderHook(
      () =>
        useESQLVariables({
          isEsqlMode,
          controlGroupApi,
          currentEsqlVariables,
          onUpdateESQLQuery,
        }),
      {
        wrapper: ({ children }) => (
          <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
        ),
      }
    );

    await act(() => setTimeout(() => {}, 0));

    return { hook, toolkit };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockControlGroupAPI = new MockControlGroupRendererApi();
  });

  it('should initialize and return handler functions', async () => {
    const { hook } = await renderUseESQLVariables({});

    expect(hook.result.current.onSaveControl).toBeInstanceOf(Function);
    expect(hook.result.current.getActivePanels).toBeInstanceOf(Function);
  });

  describe('useEffect for ControlGroupAPI input', () => {
    it('should not subscribe if not in ESQL mode or controlGroupAPI is missing', async () => {
      const { hook, toolkit } = await renderUseESQLVariables({
        isEsqlMode: false,
      });
      const dispatchSpy = jest.spyOn(toolkit.internalState, 'dispatch');

      // Try to simulate input, it should not trigger any dispatch
      act(() => {
        mockControlGroupAPI.simulateInput({
          initialChildControlState: {
            '123': { type: 'esqlControl' },
          } as unknown as ControlPanelsState<OptionsListESQLControlState>,
        });
      });

      expect(dispatchSpy).not.toHaveBeenCalled();
      hook.unmount();
    });

    it('should update Redux state when initialChildControlState is received and variables change', async () => {
      const mockNewVariables = [
        { key: 'foo', type: 'values', value: 'bar' },
      ] as ESQLControlVariable[];

      const { toolkit } = await renderUseESQLVariables({
        isEsqlMode: true,
      });
      const dataStateContainer = toolkit.getCurrentTabDataStateContainer();
      const fetchSpy = jest.spyOn(dataStateContainer, 'fetch');
      const tabId = toolkit.getCurrentTab().id;

      // Simulate initial input from controlGroupAPI
      act(() => {
        mockControlGroupAPI.simulateInput({ initialChildControlState: mockControlState });
      });

      await waitFor(() => {
        const tabState = toolkit.internalState.getState().tabs.byId[tabId];
        expect(tabState.attributes.controlGroupState).toEqual(mockControlState);
      });

      // Simulate variables published by the control manager
      act(() => {
        mockControlGroupAPI.simulateVariables(mockNewVariables);
      });

      // Assert variables were updated in internal state
      await waitFor(() => {
        const tabState = toolkit.internalState.getState().tabs.byId[tabId];
        expect(tabState.esqlVariables).toEqual(mockNewVariables);
      });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalled();
      });
    });

    it('should unsubscribe on unmount', async () => {
      const mockUnsubscribeInput = jest.fn();

      // Mock the getInput$ observable
      jest.spyOn(mockControlGroupAPI.inputSubject, 'asObservable').mockReturnValue(
        new Observable(() => {
          return () => mockUnsubscribeInput();
        })
      );

      const { toolkit } = await setup();

      const { hook } = await renderUseESQLVariables({
        toolkit,
        isEsqlMode: true,
      });

      act(() => {
        hook.unmount();
      });

      // Both subscriptions should be unsubscribed
      expect(mockUnsubscribeInput).toHaveBeenCalledTimes(1);
    });

    it('should reset control panels when tab attributes change', async () => {
      const { toolkit } = await setup();

      // Create a mock control group API with a mock updateInput method
      const mockUpdateInput = jest.fn();
      jest.spyOn(mockControlGroupAPI, 'updateInput').mockImplementation(mockUpdateInput);

      // Render the hook
      await renderUseESQLVariables({
        toolkit,
        controlGroupApi: mockControlGroupAPI as unknown as ControlGroupRendererApi,
      });

      expect(mockUpdateInput).not.toHaveBeenCalled();

      act(() => {
        toolkit.internalState.dispatch(
          internalStateActions.updateAttributes({
            tabId: toolkit.getCurrentTab().id,
            attributes: {
              controlGroupState: mockControlState,
            },
          })
        );
      });

      await waitFor(() => {
        // Assert that updateInput was called with the correct state
        expect(mockUpdateInput).toHaveBeenCalledWith({
          initialChildControlState: mockControlState,
        });
      });
    });
  });

  describe('onSaveControl', () => {
    it('should call addNewPanel and onUpdateESQLQuery', async () => {
      const mockOnTextLangQueryChange = jest.fn();
      const mockUpdatedQuery = 'new query text';

      const { hook } = await renderUseESQLVariables({
        isEsqlMode: true,
        onUpdateESQLQuery: mockOnTextLangQueryChange,
      });

      await act(async () => {
        await hook.result.current.onSaveControl(mockControlState, mockUpdatedQuery);
      });

      expect(mockControlGroupAPI.addNewPanel).toHaveBeenCalledTimes(1);
      expect(mockControlGroupAPI.addNewPanel).toHaveBeenCalledWith({
        panelType: 'esql_control',
        serializedState: {
          ...mockControlState,
        },
      });
      expect(mockOnTextLangQueryChange).not.toHaveBeenCalled();

      act(() => {
        mockControlGroupAPI.simulateInput({
          initialChildControlState: {
            '123': { type: 'esqlControl' },
          } as unknown as ControlPanelsState<OptionsListESQLControlState>,
        });
      });

      expect(mockOnTextLangQueryChange).toHaveBeenCalledTimes(1);
      expect(mockOnTextLangQueryChange).toHaveBeenCalledWith(mockUpdatedQuery);
    });

    it('should not call onUpdateESQLQuery if updatedQuery is empty', async () => {
      const mockOnTextLangQueryChange = jest.fn();

      const { hook } = await renderUseESQLVariables({
        isEsqlMode: true,
        onUpdateESQLQuery: mockOnTextLangQueryChange,
      });

      await act(async () => {
        await hook.result.current.onSaveControl(mockControlState, ''); // Empty query
      });

      expect(mockControlGroupAPI.addNewPanel).toHaveBeenCalledTimes(1);
      expect(mockOnTextLangQueryChange).not.toHaveBeenCalled();
    });
  });

  describe('getActivePanels', () => {
    it('should return currentTab.controlGroupState if available and not empty', async () => {
      const { hook } = await renderUseESQLVariables({
        isEsqlMode: true,
      });

      act(() => {
        mockControlGroupAPI.simulateInput({ initialChildControlState: mockControlState });
      });

      const activePanels = hook.result.current.getActivePanels();
      expect(activePanels).toEqual(mockControlState);
    });

    it('should return undefined if currentTab.controlGroupState is empty/invalid', async () => {
      const { hook } = await renderUseESQLVariables({
        isEsqlMode: true,
      });

      const activePanels = hook.result.current.getActivePanels();
      expect(activePanels).toEqual({}); // JSON.parse('{}') results in an empty object
    });
  });
});
