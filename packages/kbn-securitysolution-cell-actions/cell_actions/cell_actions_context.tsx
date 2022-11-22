/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, FC } from 'react';
import type { Action } from '@kbn/ui-actions-plugin/public';

type GetActionsType = undefined | ((trigger: string) => Action[]);

const initialContext = {
  getActions: undefined,
};

export const CellActionsContext = createContext<{ getActions: GetActionsType }>(initialContext);

interface CellActionsContextProviderProps {
  getActions: GetActionsType;
}

export const CellActionsContextProvider: FC<CellActionsContextProviderProps> = ({
  children,
  getActions,
}) => <CellActionsContext.Provider value={{ getActions }}>{children}</CellActionsContext.Provider>;
