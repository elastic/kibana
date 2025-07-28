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
import { FetchStatus } from '../../types';

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
  useEffect(() => {
    if (controlGroupAPI) {
      const documents$ = stateContainer.dataState.data$.documents$;
      const subscription = controlGroupAPI.esqlVariables$.subscribe((newESQLVariables) => {
        if (!isEqual(newESQLVariables, currentEsqlVariables) && isEsqlMode) {
          stateContainer.appState.update({ esqlVariables: newESQLVariables });
          documents$.next({ fetchStatus: FetchStatus.PARTIAL });
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [controlGroupAPI, currentEsqlVariables, isEsqlMode, stateContainer]);

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
