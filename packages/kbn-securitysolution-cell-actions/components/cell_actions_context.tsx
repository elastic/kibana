/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, FC } from 'react';
// TODO can't import plugin from package
import type { Action } from '@kbn/ui-actions-plugin/public';

type GetActionsType = undefined | ((trigger: string, context: object) => Promise<Action[]>);

const initialContext = {
  getCompatibleActions: undefined,
};

export const CellActionsContext = createContext<{ getCompatibleActions: GetActionsType }>(
  initialContext
);

interface CellActionsContextProviderProps {
  getCompatibleActions: GetActionsType;
}

export const CellActionsContextProvider: FC<CellActionsContextProviderProps> = ({
  children,
  getCompatibleActions,
}) => (
  <CellActionsContext.Provider value={{ getCompatibleActions }}>
    {children}
  </CellActionsContext.Provider>
);
