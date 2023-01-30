/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, FC, useContext } from 'react';

import { RpcClient } from '../rpc';

export interface Context {
  rpc: RpcClient;
}

const AppContext = createContext<Context | null>(null);

export const ContextProvider: FC<Context> = ({ children, ...ctx }) => {
  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error(`Ctx missing`);
  }
  return ctx;
};
