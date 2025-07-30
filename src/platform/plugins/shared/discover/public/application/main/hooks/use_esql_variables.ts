/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isEqual } from 'lodash';
import { useCallback, useEffect } from 'react';
import type { ControlPanelsState, ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import type { ESQLControlState, ESQLControlVariable } from '@kbn/esql-types';
import type { DiscoverStateContainer } from '../state_management/discover_state';
import {
  internalStateActions,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../state_management/redux';
import { CONTROLS_STORAGE_KEY } from '../../../../common/constants';
import type { DiscoverServices } from '../../../build_services';

/**
 * @param panels - The control panels state, which may be null.
 * @description Extracts ESQL variables from the control panels state.
 * Each ESQL control panel is expected to have a `variableName`, `variableType`, and `selectedOptions`.
 * Returns an array of `ESQLControlVariable` objects.
 * If `panels` is null or empty, it returns an empty array.
 * @returns An array of ESQLControlVariable objects.
 */
const getEsqlVariablesFromState = (
  panels: ControlPanelsState<ESQLControlState> | null
): ESQLControlVariable[] => {
  if (!panels || Object.keys(panels).length === 0) {
    return [];
  }
  const variables = Object.values(panels).reduce((acc: ESQLControlVariable[], panel) => {
    if (panel.type === 'esqlControl') {
      acc.push({
        key: panel.variableName,
        type: panel.variableType,
        value: panel.selectedOptions?.[0],
      });
    }
    return acc;
  }, []);

  return variables;
};

/**
 * Custom hook to manage ESQL variables in the control group for Discover.
 * It synchronizes ESQL control panel state with the application's internal Redux state
 * and handles persistence to storage.
 *
 * @param options - Configuration options for the hook.
 * @param options.isEsqlMode - Indicates if the current application mode is ESQL.
 * @param options.controlGroupAPI - The ControlGroupRendererApi instance for interacting with control panels.
 * @param options.currentEsqlVariables - The currently active ESQL variables from the application state.
 * @param options.stateContainer - The DiscoverStateContainer instance for data fetching.
 * @param options.storage - The storage service for persisting control panel state.
 * @param options.onTextLangQueryChange - Callback function to update the ESQL query.
 *
 * @returns An object containing handler functions for saving and canceling control changes,
 * and a function to retrieve control creation options.
 */

export const useESQLVariables = ({
  isEsqlMode,
  controlGroupAPI,
  currentEsqlVariables,
  stateContainer,
  storage,
  onTextLangQueryChange,
}: {
  isEsqlMode: boolean;
  controlGroupAPI?: ControlGroupRendererApi;
  currentEsqlVariables?: ESQLControlVariable[];
  stateContainer: DiscoverStateContainer;
  storage: DiscoverServices['storage'];
  onTextLangQueryChange: (query: string) => void;
}): {
  onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
  onCancelControl: () => void;
  getControlCreationOptions: (initialState: {
    initialChildControlState?: ControlPanelsState;
  }) => Promise<{ initialState: ControlPanelsState }>;
} => {
  const dispatch = useInternalStateDispatch();
  const currentTabId = useCurrentTabSelector((tab) => tab.id);

  // Effect to subscribe to control group input changes
  useEffect(() => {
    // Only proceed if in ESQL mode and controlGroupAPI is available
    if (!controlGroupAPI || !isEsqlMode) {
      return;
    }
    const inputSubscription = controlGroupAPI.getInput$().subscribe((input) => {
      if (input && input.initialChildControlState) {
        const esqlControlState =
          input.initialChildControlState as ControlPanelsState<ESQLControlState>;

        // Persist control state to storage or remove if empty
        if (Object.keys(esqlControlState).length === 0) {
          storage.remove(`${CONTROLS_STORAGE_KEY}:${currentTabId}`);
        } else {
          storage.set(`${CONTROLS_STORAGE_KEY}:${currentTabId}`, esqlControlState);
        }

        const newVariables = getEsqlVariablesFromState(esqlControlState);
        if (!isEqual(newVariables, currentEsqlVariables)) {
          dispatch(internalStateActions.setEsqlVariables(newVariables));
          stateContainer.dataState.fetch();
        }
      }
    });

    return () => {
      inputSubscription.unsubscribe();
    };
  }, [
    controlGroupAPI,
    currentEsqlVariables,
    dispatch,
    isEsqlMode,
    stateContainer,
    storage,
    currentTabId,
  ]);

  const onSaveControl = useCallback(
    async (controlState: Record<string, unknown>, updatedQuery: string) => {
      if (!controlGroupAPI) {
        // eslint-disable-next-line no-console
        console.error('ControlGroupAPI is not available when attempting to save control.');
        return;
      }
      // add a new control
      controlGroupAPI.addNewPanel?.({
        panelType: 'esqlControl',
        serializedState: {
          rawState: {
            ...controlState,
          },
        },
      });

      // update the query
      if (updatedQuery) {
        onTextLangQueryChange(updatedQuery);
      }
    },
    [controlGroupAPI, onTextLangQueryChange]
  );

  // Callback for canceling control changes (currently a no-op, but kept for API consistency)
  const onCancelControl = useCallback(() => {}, []); // No dependencies as it does nothing for now

  // Callback to provide initial options for control creation
  const getControlCreationOptions = useCallback(
    async (initialState: { initialChildControlState?: ControlPanelsState }) => {
      const activePanels = storage.get(`${CONTROLS_STORAGE_KEY}:${currentTabId}`);

      return {
        initialState: {
          ...initialState,
          initialChildControlState: activePanels ?? initialState.initialChildControlState,
        },
      };
    },
    [storage, currentTabId]
  );

  return { onSaveControl, onCancelControl, getControlCreationOptions };
};
