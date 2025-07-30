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
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { ControlPanelsState, ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import type { ESQLControlState, ESQLControlVariable } from '@kbn/esql-types';
import type { DiscoverStateContainer } from '../state_management/discover_state';
import {
  internalStateActions,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../state_management/redux';
import { CONTROLS_STORAGE_KEY } from '../../../../common/constants';

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
 * @param options.onTextLangQueryChange - Callback function to update the ESQL query.
 *
 * @returns An object containing handler functions for saving and canceling control changes,
 * and a getter function to retrieve the currently active control panels state for the current tab.
 */

interface ESQLControlSessionStorage {
  [key: string]: ControlPanelsState<ESQLControlState>;
}

export const useESQLVariables = ({
  isEsqlMode,
  controlGroupAPI,
  currentEsqlVariables,
  stateContainer,
  onTextLangQueryChange,
}: {
  isEsqlMode: boolean;
  controlGroupAPI?: ControlGroupRendererApi;
  currentEsqlVariables?: ESQLControlVariable[];
  stateContainer: DiscoverStateContainer;
  onTextLangQueryChange: (query: string) => void;
}): {
  onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
  onCancelControl: () => void;
  getActivePanels: () => ControlPanelsState<ESQLControlState> | undefined;
} => {
  const dispatch = useInternalStateDispatch();
  const currentTabId = useCurrentTabSelector((tab) => tab.id);

  const [controlsStateMap, setControlsStateMap] = useSessionStorage<
    ESQLControlSessionStorage | undefined
  >(CONTROLS_STORAGE_KEY);
  // Effect to subscribe to control group input changes
  useEffect(() => {
    // Only proceed if in ESQL mode and controlGroupAPI is available
    if (!controlGroupAPI || !isEsqlMode) {
      return;
    }
    const inputSubscription = controlGroupAPI.getInput$().subscribe((input) => {
      if (input && input.initialChildControlState) {
        const currentTabControlState =
          input.initialChildControlState as ControlPanelsState<ESQLControlState>;

        const newControlsStateMap = { ...(controlsStateMap || {}) };

        // Check if the current tab's state is empty
        if (Object.keys(currentTabControlState).length === 0) {
          // If the current tab's state exists in storage, delete it.
          if (newControlsStateMap[currentTabId]) {
            delete newControlsStateMap[currentTabId];
            // Only update if something was actually deleted to avoid unnecessary renders
            if (!isEqual(controlsStateMap, newControlsStateMap)) {
              setControlsStateMap(newControlsStateMap);
            }
          }
        } else {
          // If the state for the current tab has changed, update it.
          if (!isEqual(newControlsStateMap[currentTabId], currentTabControlState)) {
            newControlsStateMap[currentTabId] = currentTabControlState;
            setControlsStateMap(newControlsStateMap);
          }
        }

        const newVariables = getEsqlVariablesFromState(currentTabControlState);
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
    controlsStateMap,
    setControlsStateMap,
    dispatch,
    isEsqlMode,
    stateContainer,
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

  // Getter function to retrieve the currently active control panels state for the current tab
  const getActivePanels = useCallback(() => {
    return controlsStateMap?.[currentTabId];
  }, [controlsStateMap, currentTabId]); // Dependencies are important for `useCallback`

  return {
    onSaveControl,
    onCancelControl,
    getActivePanels,
  };
};
