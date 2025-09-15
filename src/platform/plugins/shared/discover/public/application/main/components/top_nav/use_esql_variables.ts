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
import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { ESQLControlState, ESQLControlVariable } from '@kbn/esql-types';
import { skip } from 'rxjs';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import {
  extractEsqlVariables,
  internalStateActions,
  parseControlGroupJson,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { useSavedSearch } from '../../state_management/discover_state_provider';

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
 * @param options.onUpdateESQLQuery - Callback function to update the ESQL query.
 *
 * @returns An object containing handler functions for saving and canceling control changes,
 * and a getter function to retrieve the currently active control panels state for the current tab.
 */

export const useESQLVariables = ({
  isEsqlMode,
  controlGroupApi,
  currentEsqlVariables,
  stateContainer,
  onUpdateESQLQuery,
}: {
  isEsqlMode: boolean;
  controlGroupApi?: ControlGroupRendererApi;
  currentEsqlVariables?: ESQLControlVariable[];
  stateContainer: DiscoverStateContainer;
  onUpdateESQLQuery: (query: string) => void;
}): {
  onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
  getActivePanels: () => ControlPanelsState<ESQLControlState> | undefined;
} => {
  const dispatch = useInternalStateDispatch();
  const setControlGroupState = useCurrentTabAction(internalStateActions.setControlGroupState);
  const setEsqlVariables = useCurrentTabAction(internalStateActions.setEsqlVariables);
  const currentControlGroupState = useCurrentTabSelector((tab) => tab.controlGroupState);

  const savedSearchState = useSavedSearch();

  useEffect(() => {
    // Only proceed if in ESQL mode and controlGroupApi is available
    if (!controlGroupApi || !isEsqlMode) {
      return;
    }

    // Handling the reset unsaved changes badge
    const savedSearchResetSubsciption = stateContainer.savedSearchState
      .getInitial$()
      .pipe(skip(1)) // Skip the initial emission since it's a BehaviorSubject
      .subscribe((initialSavedSearch) => {
        const savedControlGroupState = parseControlGroupJson(initialSavedSearch?.controlGroupJson);
        controlGroupApi.updateInput({ initialChildControlState: savedControlGroupState });
      });

    const inputSubscription = controlGroupApi.getInput$().subscribe((input) => {
      if (input && input.initialChildControlState) {
        const currentTabControlState =
          input.initialChildControlState as ControlPanelsState<ESQLControlState>;

        stateContainer.savedSearchState.updateControlState({
          nextControlState: currentTabControlState,
        });
        dispatch(
          setControlGroupState({
            controlGroupState: currentTabControlState,
          })
        );
        const newVariables = extractEsqlVariables(currentTabControlState);
        if (!isEqual(newVariables, currentEsqlVariables)) {
          // Update the ESQL variables in the internal state
          dispatch(setEsqlVariables({ esqlVariables: newVariables }));
          stateContainer.dataState.fetch();
        }
      }
    });

    return () => {
      inputSubscription.unsubscribe();
      savedSearchResetSubsciption.unsubscribe();
    };
  }, [
    controlGroupApi,
    currentEsqlVariables,
    dispatch,
    isEsqlMode,
    setControlGroupState,
    setEsqlVariables,
    stateContainer.dataState,
    stateContainer.savedSearchState,
  ]);

  const onSaveControl = useCallback(
    async (controlState: Record<string, unknown>, updatedQuery: string) => {
      if (!controlGroupApi) {
        // eslint-disable-next-line no-console
        console.error('controlGroupApi is not available when attempting to save control.');
        return;
      }
      // add a new control
      controlGroupApi.addNewPanel({
        panelType: ESQL_CONTROL,
        serializedState: {
          rawState: {
            ...controlState,
          },
        },
      });

      // update the query
      if (updatedQuery) {
        onUpdateESQLQuery(updatedQuery);
      }
    },
    [controlGroupApi, onUpdateESQLQuery]
  );

  // Getter function to retrieve the currently active control panels state for the current tab
  const getActivePanels = useCallback(() => {
    if (currentControlGroupState && Object.keys(currentControlGroupState).length > 0) {
      return currentControlGroupState;
    }
    return parseControlGroupJson(savedSearchState?.controlGroupJson);
  }, [currentControlGroupState, savedSearchState?.controlGroupJson]);

  return {
    onSaveControl,
    getActivePanels,
  };
};
