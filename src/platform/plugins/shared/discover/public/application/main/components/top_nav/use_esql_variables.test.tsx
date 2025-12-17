/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ControlPanelsState, ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject, Observable, skip } from 'rxjs';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { mockControlState } from '../../../../__mocks__/esql_controls';
import { useESQLVariables } from './use_esql_variables';
import type {
  ESQLControlState,
  ESQLControlVariable,
  ESQLVariableType,
  EsqlControlType,
} from '@kbn/esql-types';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import React from 'react';

// Mock ControlGroupRendererApi
class MockControlGroupRendererApi {
  inputSubject: BehaviorSubject<Record<string, ControlPanelsState<ESQLControlState>> | null>;
  addNewPanel: jest.Mock;

  constructor() {
    this.inputSubject = new BehaviorSubject<Record<
      string,
      ControlPanelsState<ESQLControlState>
    > | null>(null);
    this.addNewPanel = jest.fn();
  }

  getInput$() {
    return this.inputSubject.asObservable().pipe(skip(1));
  }

  // Method to simulate new input coming from the API
  simulateInput(input: Record<string, ControlPanelsState<ESQLControlState>>) {
    this.inputSubject.next(input);
  }
}

// --- Test Suite ---
describe('useESQLVariables', () => {
  let mockControlGroupAPI: MockControlGroupRendererApi;
  const getStateContainer = () => getDiscoverStateMock({ isTimeBased: true });

  const renderUseESQLVariables = async ({
    stateContainer = getStateContainer(),
    isEsqlMode = true,
    controlGroupApi = mockControlGroupAPI as unknown as ControlGroupRendererApi,
    currentEsqlVariables = [],
    onUpdateESQLQuery = jest.fn(),
  }: {
    stateContainer?: DiscoverStateContainer;
    isEsqlMode?: boolean;
    controlGroupApi?: ControlGroupRendererApi;
    currentEsqlVariables?: ESQLControlVariable[];
    onUpdateESQLQuery?: (query: string) => void;
  }) => {
    const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => (
      <DiscoverTestProvider stateContainer={stateContainer}>{children}</DiscoverTestProvider>
    );

    const hook = renderHook(
      () =>
        useESQLVariables({
          stateContainer,
          isEsqlMode,
          controlGroupApi,
          currentEsqlVariables,
          onUpdateESQLQuery,
        }),
      {
        wrapper: Wrapper,
      }
    );

    await act(() => setTimeout(() => {}, 0));

    return { hook };
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
      const stateContainer = getStateContainer();
      const dispatchSpy = jest.spyOn(stateContainer.internalState, 'dispatch');

      const { hook } = await renderUseESQLVariables({
        isEsqlMode: false,
        stateContainer,
      });

      // Try to simulate input, it should not trigger any dispatch
      act(() => {
        mockControlGroupAPI.simulateInput({
          initialChildControlState: {
            '123': { type: 'esqlControl' },
          } as unknown as ControlPanelsState<ESQLControlState>,
        });
      });

      expect(dispatchSpy).not.toHaveBeenCalled();
      hook.unmount();
    });

    it('should update Redux state when initialChildControlState is received and variables change', async () => {
      const mockNewVariables = [
        { key: 'foo', type: 'values', value: 'bar' },
      ] as ESQLControlVariable[];

      const stateContainer = getStateContainer();
      const dispatchSpy = jest.spyOn(stateContainer.internalState, 'dispatch');
      const updateControlStateSpy = jest.spyOn(
        stateContainer.savedSearchState,
        'updateControlState'
      );
      const fetchSpy = jest.spyOn(stateContainer.dataState, 'fetch');

      await renderUseESQLVariables({
        isEsqlMode: true,
        stateContainer,
      });

      // Simulate initial input from controlGroupAPI
      act(() => {
        mockControlGroupAPI.simulateInput({ initialChildControlState: mockControlState });
      });

      // Assert dispatches happened
      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledTimes(2);
        const dispatchCalls = dispatchSpy.mock.calls;
        dispatchCalls.forEach((call) => {
          const action = call[0] as { type: string; payload?: unknown };
          if (action.type === 'internalState/setControlGroupState') {
            expect((action.payload as { controlGroupState: unknown }).controlGroupState).toEqual(
              mockControlState
            );
          }
          if (action.type === 'internalState/setEsqlVariables') {
            expect((action.payload as { esqlVariables: unknown }).esqlVariables).toEqual(
              mockNewVariables
            );
          }
        });
      });

      await waitFor(() => {
        expect(updateControlStateSpy).toHaveBeenCalledWith({
          nextControlState: mockControlState,
        });
      });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalled();
      });
    });

    it('should unsubscribe on unmount', async () => {
      const mockUnsubscribeInput = jest.fn();
      const mockUnsubscribeReset = jest.fn();

      // Mock the getInput$ observable
      jest.spyOn(mockControlGroupAPI.inputSubject, 'asObservable').mockReturnValue(
        new Observable(() => {
          return () => mockUnsubscribeInput();
        })
      );

      // Mock the savedSearchState with getInitial$ observable
      const stateContainer = getStateContainer();
      const mockGetInitial$ = new BehaviorSubject(null) as unknown as BehaviorSubject<SavedSearch>;
      jest.spyOn(mockGetInitial$, 'pipe').mockReturnValue(
        new Observable(() => {
          return () => mockUnsubscribeReset();
        })
      );
      jest.spyOn(stateContainer.savedSearchState, 'getInitial$').mockReturnValue(mockGetInitial$);

      const { hook } = await renderUseESQLVariables({
        isEsqlMode: true,
        stateContainer,
      });

      act(() => {
        hook.unmount();
      });

      // Both subscriptions should be unsubscribed
      expect(mockUnsubscribeInput).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribeReset).toHaveBeenCalledTimes(1);
    });

    it('should reset control panels from saved search state when getInitial$ emits', async () => {
      const mockInitialSavedSearch = {
        controlGroupJson: JSON.stringify(mockControlState),
        // other saved search properties
      };
      const mockGetInitial$ = new BehaviorSubject(mockInitialSavedSearch as SavedSearch);

      const stateContainer = getStateContainer();

      jest.spyOn(stateContainer.savedSearchState, 'getInitial$').mockReturnValue(mockGetInitial$);

      // Create a mock control group API with a mock updateInput method
      const mockUpdateInput = jest.fn();
      const mockControlGroupApiWithUpdate = {
        ...mockControlGroupAPI,
        updateInput: mockUpdateInput,
        getInput$: jest.fn().mockReturnValue(new Observable()),
      };

      // Render the hook
      await renderUseESQLVariables({
        stateContainer,
        controlGroupApi: mockControlGroupApiWithUpdate as unknown as ControlGroupRendererApi,
      });

      expect(mockUpdateInput).not.toHaveBeenCalled();

      // Simulate getInitial$ emitting a new saved search
      act(() => {
        mockGetInitial$.next(mockInitialSavedSearch as SavedSearch);
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
        panelType: 'esqlControl',
        serializedState: {
          rawState: {
            ...mockControlState,
          },
        },
      });
      expect(mockOnTextLangQueryChange).not.toHaveBeenCalled();

      act(() => {
        mockControlGroupAPI.simulateInput({
          initialChildControlState: {
            '123': { type: 'esqlControl' },
          } as unknown as ControlPanelsState<ESQLControlState>,
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

    it('should handle numeric type coercion for ESQL variable values', async () => {
      const stateContainer = getStateContainer();
      const dispatchSpy = jest.spyOn(stateContainer.internalState, 'dispatch');

      await renderUseESQLVariables({
        isEsqlMode: true,
        stateContainer,
      });

      // Test case 1: String that can be converted to a number
      const mockControlWithNumericString = {
        panel1: {
          type: 'esqlControl',
          variableType: 'values' as ESQLVariableType,
          variableName: 'numericVar',
          selectedOptions: ['123'], // String that can be converted to number
          title: 'Numeric Panel',
          availableOptions: ['123', '456'],
          esqlQuery: '',
          controlType: 'STATIC_VALUES' as EsqlControlType,
          order: 0,
        },
      };

      act(() => {
        mockControlGroupAPI.simulateInput({
          initialChildControlState: mockControlWithNumericString,
        });
      });

      await waitFor(() => {
        const setEsqlVariablesCall = dispatchSpy.mock.calls.find(
          (call) => (call[0] as { type: string }).type === 'internalState/setEsqlVariables'
        );
        expect(setEsqlVariablesCall).toBeTruthy();
        expect(
          (setEsqlVariablesCall![0] as unknown as { payload: { esqlVariables: unknown } }).payload
            .esqlVariables
        ).toEqual([
          {
            key: 'numericVar',
            type: 'values',
            value: 123, // Should be converted to number
          },
        ]);
      });

      jest.clearAllMocks();

      // Test case 2: String that cannot be converted to a number
      const mockControlWithTextString = {
        panel2: {
          type: 'esqlControl',
          variableType: 'values' as ESQLVariableType,
          variableName: 'textVar',
          selectedOptions: ['hello'], // String that cannot be converted to number
          title: 'Text Panel',
          availableOptions: ['hello', 'world'],
          esqlQuery: '',
          controlType: 'STATIC_VALUES' as EsqlControlType,
          order: 0,
        },
      };

      act(() => {
        mockControlGroupAPI.simulateInput({
          initialChildControlState: mockControlWithTextString,
        });
      });

      await waitFor(() => {
        const setEsqlVariablesCall = dispatchSpy.mock.calls.find(
          (call) => (call[0] as { type: string }).type === 'internalState/setEsqlVariables'
        );
        expect(setEsqlVariablesCall).toBeTruthy();
        expect(
          (setEsqlVariablesCall![0] as unknown as { payload: { esqlVariables: unknown } }).payload
            .esqlVariables
        ).toEqual([
          {
            key: 'textVar',
            type: 'values',
            value: 'hello', // Should remain as string
          },
        ]);
      });

      jest.clearAllMocks();
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

    it('should return undefined if both currentTab.controlGroupState and savedSearchState.controlGroupJson are empty/invalid', async () => {
      const { hook } = await renderUseESQLVariables({
        isEsqlMode: true,
      });

      const activePanels = hook.result.current.getActivePanels();
      expect(activePanels).toEqual({}); // JSON.parse('{}') results in an empty object
    });
  });
});
