/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isEqual, omit } from 'lodash';
import { useCallback, useEffect, useRef } from 'react';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ControlGroupRendererApi, ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import {
  extractEsqlVariables,
  internalStateActions,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { getDefinedControlGroupState } from '../../state_management/utils/get_defined_control_group_state';

/**
 * Custom hook to manage ESQL variables in the control group for Discover.
 * It synchronizes ESQL control panel state with the application's internal Redux state
 * and handles persistence to storage.
 *
 * @param options - Configuration options for the hook.
 * @param options.isEsqlMode - Indicates if the current application mode is ESQL.
 * @param options.controlGroupApi - The ControlGroupRendererApi instance for interacting with control panels.
 * @param options.currentEsqlVariables - The currently active ESQL variables from the application state.
 * @param options.onUpdateESQLQuery - Callback function to update the ESQL query.
 *
 * @returns An object containing handler functions for saving and canceling control changes,
 * and a getter function to retrieve the currently active control panels state for the current tab.
 */

export const useESQLVariables = ({
  isEsqlMode,
  controlGroupApi,
  currentEsqlVariables,
  onUpdateESQLQuery,
}: {
  isEsqlMode: boolean;
  controlGroupApi?: ControlGroupRendererApi;
  currentEsqlVariables?: ESQLControlVariable[];
  onUpdateESQLQuery: (query: string) => void;
}): {
  onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
  getActivePanels: () => ControlPanelsState<OptionsListESQLControlState> | undefined;
} => {
  const dispatch = useInternalStateDispatch();
  const fetchData = useCurrentTabAction(internalStateActions.fetchData);
  const updateAttributes = useCurrentTabAction(internalStateActions.updateAttributes);
  const setEsqlVariables = useCurrentTabAction(internalStateActions.setEsqlVariables);
  const currentControlGroupState = useCurrentTabSelector((tab) => tab.attributes.controlGroupState);
  const previousControlGroupStateRef = useRef(currentControlGroupState);
  const pendingQueryUpdate = useRef<string>();

  useEffect(() => {
    // Only proceed if in ESQL mode and controlGroupApi is available
    if (!controlGroupApi || !isEsqlMode) {
      return;
    }

    // Handling the reset unsaved changes badge
    if (!isEqual(previousControlGroupStateRef.current, currentControlGroupState)) {
      previousControlGroupStateRef.current = currentControlGroupState;
      controlGroupApi.updateInput({ initialChildControlState: currentControlGroupState });
    }
  }, [currentControlGroupState, controlGroupApi, isEsqlMode]);

  useEffect(() => {
    // Only proceed if in ESQL mode and controlGroupApi is available
    if (!controlGroupApi || !isEsqlMode) {
      return;
    }

    const inputSubscription = controlGroupApi.getInput$().subscribe((input) => {
      const controlGroupState =
        input.initialChildControlState as ControlPanelsState<OptionsListESQLControlState>;
      // drop unused keys for BWC
      const transformedState = Object.keys(controlGroupState).reduce((prev, key) => {
        return { ...prev, [key]: omit(controlGroupState[key], ['id', 'useGlobalFilters']) };
      }, {});
      const nextControlGroupState = transformedState;
      previousControlGroupStateRef.current = nextControlGroupState;
      dispatch(
        updateAttributes({
          attributes: {
            controlGroupState: nextControlGroupState,
          },
        })
      );

      if (pendingQueryUpdate.current) {
        onUpdateESQLQuery(pendingQueryUpdate.current);
        pendingQueryUpdate.current = undefined;
      }

      const newVariables = extractEsqlVariables(controlGroupState);
      if (!isEqual(newVariables, currentEsqlVariables)) {
        // Update the ESQL variables in the internal state
        dispatch(setEsqlVariables({ esqlVariables: newVariables }));
        dispatch(fetchData({}));
      }
    });

    return () => {
      inputSubscription.unsubscribe();
    };
  }, [
    controlGroupApi,
    currentEsqlVariables,
    dispatch,
    isEsqlMode,
    onUpdateESQLQuery,
    updateAttributes,
    setEsqlVariables,
    fetchData,
  ]);

  const onSaveControl = useCallback(
    async (controlState: Record<string, unknown>, updatedQuery: string) => {
      if (!controlGroupApi) {
        // eslint-disable-next-line no-console
        console.error('controlGroupApi is not available when attempting to save control.');
        return;
      }

      // update the query
      pendingQueryUpdate.current = updatedQuery;

      // add a new control
      await controlGroupApi.addNewPanel({
        panelType: ESQL_CONTROL,
        serializedState: {
          ...controlState,
        },
      });
    },
    [controlGroupApi]
  );

  // Getter function to retrieve the currently active control panels state for the current tab
  const getActivePanels = useCallback(() => {
    return getDefinedControlGroupState(currentControlGroupState) || {};
  }, [currentControlGroupState]);

  return {
    onSaveControl,
    getActivePanels,
  };
};
