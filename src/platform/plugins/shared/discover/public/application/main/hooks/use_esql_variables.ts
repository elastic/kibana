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
import { internalStateActions, useInternalStateDispatch } from '../state_management/redux';

/**
 * @param panels ControlPanelsState<ESQLControlState> | null
 * @description Extracts ESQL variables from the control panels state.
 * Each ESQL control panel is expected to have a variableName, variableType, and selectedOptions.
 * The function returns an array of ESQLControlVariable objects.
 * If the panels are null, it returns an empty array.
 * @returns ESQLControlVariable[]
 */
const getEsqlVariablesFromState = (
  panels: ControlPanelsState<ESQLControlState> | null
): ESQLControlVariable[] => {
  if (!panels) {
    return [];
  }
  const variables: ESQLControlVariable[] = [];
  Object.values(panels).forEach((panel) => {
    if (panel.type !== 'esqlControl') {
      return;
    }
    variables.push({
      key: panel.variableName,
      type: panel.variableType,
      value: panel.selectedOptions[0],
    });
  });
  return variables;
};

/**
 * Custom hook to manage ESQL variables in the control group.
 * It listens for changes in the control group API and updates the ESQL variables in the state.
 *
 * @param isEsqlMode - Indicates if the current mode is ESQL.
 * @param controlGroupAPI - The ControlGroupRendererApi instance.
 * @param currentEsqlVariables - The current ESQL variables from the state.
 * @param stateContainer - The DiscoverStateContainer instance.
 * @param onTextLangQueryChange - Callback to handle changes in the text language query.
 */

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
}) => {
  const dispatch = useInternalStateDispatch();

  useEffect(() => {
    if (!controlGroupAPI || !isEsqlMode) {
      return;
    }
    const stateStorage = stateContainer.stateStorage;
    const inputSubscription = controlGroupAPI.getInput$().subscribe((input) => {
      if (input && input.initialChildControlState) {
        const esqlControlState =
          input.initialChildControlState as ControlPanelsState<ESQLControlState>;
        stateStorage.set('controlPanels', esqlControlState);
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
  }, [controlGroupAPI, currentEsqlVariables, dispatch, isEsqlMode, stateContainer]);

  const onSaveControl = useCallback(
    async (controlState: Record<string, unknown>, updatedQuery: string) => {
      if (!controlGroupAPI) {
        return;
      }
      // add a new control
      controlGroupAPI?.addNewPanel?.({
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

  const onCancelControl = useCallback(() => {}, []);

  return { onSaveControl, onCancelControl };
};
