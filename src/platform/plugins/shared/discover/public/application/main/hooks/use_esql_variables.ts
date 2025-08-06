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
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../state_management/redux';
import { useSavedSearch } from '../state_management/discover_state_provider';

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
 * @param options.controlGroupApi - The ControlGroupRendererApi instance for interacting with control panels.
 * @param options.currentEsqlVariables - The currently active ESQL variables from the application state.
 * @param options.stateContainer - The DiscoverStateContainer instance for data fetching.
 * @param options.onTextLangQueryChange - Callback function to update the ESQL query.
 *
 * @returns An object containing handler functions for saving and canceling control changes,
 * and a getter function to retrieve the currently active control panels state for the current tab.
 */

export const useESQLVariables = ({
  isEsqlMode,
  controlGroupApi,
  currentEsqlVariables,
  stateContainer,
  onTextLangQueryChange,
}: {
  isEsqlMode: boolean;
  controlGroupApi?: ControlGroupRendererApi;
  currentEsqlVariables?: ESQLControlVariable[];
  stateContainer: DiscoverStateContainer;
  onTextLangQueryChange: (query: string) => void;
}): {
  onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
  getActivePanels: () => ControlPanelsState<ESQLControlState> | undefined;
} => {
  const dispatch = useInternalStateDispatch();
  const setControlGroupState = useCurrentTabAction(internalStateActions.setControlGroupState);
  const currentTab = useCurrentTabSelector((tab) => tab);

  const savedSearchState = useSavedSearch();

  useEffect(() => {
    // Only proceed if in ESQL mode and controlGroupApi is available
    if (!controlGroupApi || !isEsqlMode) {
      return;
    }
    const inputSubscription = controlGroupApi.getInput$().subscribe((input) => {
      if (input && input.initialChildControlState) {
        const currentTabControlState =
          input.initialChildControlState as ControlPanelsState<ESQLControlState>;

        dispatch(
          setControlGroupState({
            controlGroupState: currentTabControlState,
          })
        );
        const newVariables = getEsqlVariablesFromState(currentTabControlState);
        if (!isEqual(newVariables, currentEsqlVariables)) {
          dispatch(internalStateActions.setEsqlVariables(newVariables));
          // handling the unsaved changes badge
          stateContainer.savedSearchState.updateControlState({
            nextControlState: currentTabControlState,
          });
          stateContainer.dataState.fetch();
        }
      }
    });

    return () => {
      inputSubscription.unsubscribe();
    };
  }, [
    controlGroupApi,
    setControlGroupState,
    currentEsqlVariables,
    dispatch,
    isEsqlMode,
    stateContainer,
  ]);

  const onSaveControl = useCallback(
    async (controlState: Record<string, unknown>, updatedQuery: string) => {
      if (!controlGroupApi) {
        // eslint-disable-next-line no-console
        console.error('controlGroupApi is not available when attempting to save control.');
        return;
      }
      // add a new control
      controlGroupApi.addNewPanel?.({
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
    [controlGroupApi, onTextLangQueryChange]
  );

  // Getter function to retrieve the currently active control panels state for the current tab
  const getActivePanels = useCallback(() => {
    const savedControlGroupState = JSON.parse(
      savedSearchState?.controlGroupJson || '{}'
    ) as ControlPanelsState<ESQLControlState>;
    const currentControlGroupState =
      currentTab.controlGroupState && Object.keys(currentTab.controlGroupState).length > 0
        ? currentTab.controlGroupState
        : savedControlGroupState;
    return currentControlGroupState;
  }, [currentTab, savedSearchState]);

  return {
    onSaveControl,
    getActivePanels,
  };
};
