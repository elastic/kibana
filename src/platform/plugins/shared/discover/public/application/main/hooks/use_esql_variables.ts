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
import { type ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DiscoverStateContainer } from '../state_management/discover_state';
import { internalStateActions, useInternalStateDispatch } from '../state_management/redux';

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
    if (!controlGroupAPI) {
      return;
    }
    const stateStorage = stateContainer.stateStorage;
    const subscription = controlGroupAPI.esqlVariables$.subscribe((newESQLVariables) => {
      if (!isEqual(newESQLVariables, currentEsqlVariables) && isEsqlMode) {
        dispatch(internalStateActions.setEsqlVariables(newESQLVariables));
        stateContainer.dataState.fetch();
      }
    });
    const inputSubscription = controlGroupAPI.getInput$().subscribe((input) => {
      if (input && input.initialChildControlState)
        stateStorage.set('controlPanels', input.initialChildControlState);
    });

    return () => {
      subscription.unsubscribe();
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
