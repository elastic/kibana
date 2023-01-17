/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { orderBy } from 'lodash/fp';
import React, { createContext, FC, useCallback, useContext } from 'react';
import type { Action, CellActionExecutionContext } from '../types';

// It must to match `UiActionsService.getTriggerCompatibleActions`
type GetTriggerCompatibleActionsType = (triggerId: string, context: object) => Promise<Action[]>;

type GetActionsType = (context: CellActionExecutionContext) => Promise<Action[]>;

const CellActionsContext = createContext<{ getActions: GetActionsType } | null>(null);

interface CellActionsProviderProps {
  /**
   * Please assign `uiActions.getTriggerCompatibleActions` function.
   * This function should return a list of actions for a triggerId that are compatible with the provided context.
   */
  getTriggerCompatibleActions: GetTriggerCompatibleActionsType;
}

export const CellActionsProvider: FC<CellActionsProviderProps> = ({
  children,
  getTriggerCompatibleActions,
}) => {
  const getSortedCompatibleActions = useCallback<GetActionsType>(
    (context) =>
      getTriggerCompatibleActions(context.trigger.id, context).then((actions) =>
        orderBy(['order', 'id'], ['asc', 'asc'], actions)
      ),
    [getTriggerCompatibleActions]
  );

  return (
    <CellActionsContext.Provider value={{ getActions: getSortedCompatibleActions }}>
      {children}
    </CellActionsContext.Provider>
  );
};

export const useCellActionsContext = () => {
  const context = useContext(CellActionsContext);
  if (!context) {
    throw new Error(
      'No CellActionsContext found. Please wrap the application with CellActionsProvider'
    );
  }

  return context;
};
