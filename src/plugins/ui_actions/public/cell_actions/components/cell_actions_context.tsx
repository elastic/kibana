/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { orderBy } from 'lodash/fp';
import React, { createContext, FC, useContext, useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { Action } from '../../actions';
import { CellActionExecutionContext } from './cell_actions';

type GetActionsType = (trigger: string, context: object) => Promise<Action[]>;

const initialContext = {
  getCompatibleActions: undefined,
};

const CellActionsContext = createContext<{
  getCompatibleActions: GetActionsType | undefined;
}>(initialContext);

interface CellActionsContextProviderProps {
  /**
   * Please assign `uiActions.getTriggerCompatibleActions` function.
   * This function should return a list of actions for a triggerId that are compatible with the provided context.
   */
  getCompatibleActions: GetActionsType;
}

export const CellActionsContextProvider: FC<CellActionsContextProviderProps> = ({
  children,
  getCompatibleActions,
}) => {
  const getSortedCompatibleActions = useMemo<GetActionsType>(() => {
    return (trigger, context) =>
      getCompatibleActions(trigger, context).then((actions) =>
        orderBy(['order', 'id'], ['asc', 'asc'], actions)
      );
  }, [getCompatibleActions]);

  return (
    <CellActionsContext.Provider value={{ getCompatibleActions: getSortedCompatibleActions }}>
      {children}
    </CellActionsContext.Provider>
  );
};

const useGetCompatibleActions = () => {
  const context = useContext(CellActionsContext);
  if (context.getCompatibleActions === undefined) {
    // eslint-disable-next-line no-console
    console.error(
      'No CellActionsContext found. Please wrap the application with CellActionsContextProvider'
    );
  }

  return (cellActionContext: CellActionExecutionContext) =>
    context.getCompatibleActions
      ? context.getCompatibleActions(cellActionContext.trigger.id, cellActionContext)
      : Promise.resolve([]);
};

export const useLoadActions = (context: CellActionExecutionContext) => {
  const getCompatibleActions = useGetCompatibleActions();
  return useAsync(() => getCompatibleActions(context), []);
};

export const useLoadActionsFn = () => {
  const getCompatibleActions = useGetCompatibleActions();
  return useAsyncFn(getCompatibleActions, []);
};
