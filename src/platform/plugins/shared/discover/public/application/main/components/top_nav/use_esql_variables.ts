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
import type { ESQLControlState, ESQLControlVariable } from '@kbn/esql-types';
import type { ControlGroupRendererApi, ControlPanelsState } from '@kbn/control-group-renderer';
import {
  extractEsqlVariables,
  internalStateActions,
  parseControlGroupJson,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';

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
  getActivePanels: () => ControlPanelsState<ESQLControlState> | undefined;
} => {
  const dispatch = useInternalStateDispatch();
  const fetchData = useCurrentTabAction(internalStateActions.fetchData);
  const setAttributeControlGroupJson = useCurrentTabAction(
    internalStateActions.setAttributeControlGroupJson
  );
  const setControlGroupState = useCurrentTabAction(internalStateActions.setControlGroupState);
  const setEsqlVariables = useCurrentTabAction(internalStateActions.setEsqlVariables);
  const currentControlGroupState = useCurrentTabSelector((tab) => tab.controlGroupState);
  const controlGroupJson = useCurrentTabSelector((tab) => tab.attributes.controlGroupJson);
  const activeControlGroupJsonRef = useRef<string | undefined>(controlGroupJson);
  const pendingQueryUpdate = useRef<string>();

  useEffect(() => {
    // Only proceed if in ESQL mode and controlGroupApi is available
    if (!controlGroupApi || !isEsqlMode) {
      return;
    }

    // Handling the reset unsaved changes badge
    if (activeControlGroupJsonRef.current !== controlGroupJson) {
      activeControlGroupJsonRef.current = controlGroupJson;
      const savedControlGroupState = parseControlGroupJson(controlGroupJson);
      controlGroupApi.updateInput({ initialChildControlState: savedControlGroupState });
    }
  }, [controlGroupJson, controlGroupApi, isEsqlMode]);

  useEffect(() => {
    // Only proceed if in ESQL mode and controlGroupApi is available
    if (!controlGroupApi || !isEsqlMode) {
      return;
    }

    const inputSubscription = controlGroupApi.getInput$().subscribe((input) => {
      const controlGroupState =
        input.initialChildControlState as ControlPanelsState<ESQLControlState>;
      // drop unused keys for BWC
      const transformedState = Object.keys(controlGroupState).reduce((prev, key) => {
        return { ...prev, [key]: omit(controlGroupState[key], ['id', 'useGlobalFilters']) };
      }, {});
      const nextControlGroupJson = JSON.stringify(transformedState);
      activeControlGroupJsonRef.current = nextControlGroupJson;
      dispatch(
        setAttributeControlGroupJson({
          controlGroupJson: nextControlGroupJson,
        })
      );
      dispatch(
        setControlGroupState({
          controlGroupState: transformedState,
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
    setAttributeControlGroupJson,
    setControlGroupState,
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
    if (currentControlGroupState && Object.keys(currentControlGroupState).length > 0) {
      return currentControlGroupState;
    }
    return parseControlGroupJson(controlGroupJson);
  }, [currentControlGroupState, controlGroupJson]);

  return {
    onSaveControl,
    getActivePanels,
  };
};
