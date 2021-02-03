/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { createContext, useReducer, Dispatch } from 'react';
import { createUseContext } from './create_use_context';
import * as store from '../stores/request';

const RequestReadContext = createContext<store.Store>(null as any);
const RequestActionContext = createContext<Dispatch<store.Actions>>(null as any);

export function RequestContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(store.reducer, store.initialValue);
  return (
    <RequestReadContext.Provider value={state}>
      <RequestActionContext.Provider value={dispatch}>{children}</RequestActionContext.Provider>
    </RequestReadContext.Provider>
  );
}

export const useRequestReadContext = createUseContext(RequestReadContext, 'RequestReadContext');
export const useRequestActionContext = createUseContext(
  RequestActionContext,
  'RequestActionContext'
);
