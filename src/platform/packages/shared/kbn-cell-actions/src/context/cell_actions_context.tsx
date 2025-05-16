/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { orderBy } from 'lodash/fp';
import React, { createContext, useContext, useMemo } from 'react';
import type { CellAction, CellActionsProviderProps, GetActions } from '../types';

interface CellActionsContextValue {
  getActions: GetActions;
}
const CellActionsContext = createContext<CellActionsContextValue | null>(null);

export const CellActionsProvider: React.FC<CellActionsProviderProps> = ({
  children,
  getTriggerCompatibleActions,
}) => {
  const value = useMemo<CellActionsContextValue>(
    () => ({
      getActions: (context) =>
        getTriggerCompatibleActions(context.trigger.id, context).then((actions) =>
          orderBy(['order', 'id'], ['asc', 'asc'], actions)
        ) as Promise<CellAction[]>,
    }),
    [getTriggerCompatibleActions]
  );

  // make sure that provider's value does not change
  return <CellActionsContext.Provider value={value}>{children}</CellActionsContext.Provider>;
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
