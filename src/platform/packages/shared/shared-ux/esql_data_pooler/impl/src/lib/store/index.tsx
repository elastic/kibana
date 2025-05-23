/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
  type Dispatch,
  type PropsWithChildren,
} from 'react';
import { once } from 'lodash';
import { type IStoreState, type IDispatchAction, storeReducer } from './reducers';
import { getStatsGroupByColumnsFromQuery } from '../parse_esql';

interface IStoreContext {
  state: IStoreState;
  dispatch: Dispatch<IDispatchAction>;
}

interface IDataPoolerProviderProps {
  query: string;
}

export const createStore = once(() => {
  return createContext<IStoreContext | null>(null);
});

export function DataPoolerProvider({
  query,
  children,
}: PropsWithChildren<IDataPoolerProviderProps>) {
  const StoreContext = createStore();
  const initialState = useRef({
    currentQueryString: '',
    groupByColumns: null,
    currentGroupByColumn: null,
  });

  const createInitialState = useCallback(
    (state: IStoreContext['state']) => {
      if (query !== state.currentQueryString) {
        const columns = getStatsGroupByColumnsFromQuery(query);
        return {
          currentQueryString: query,
          groupByColumns: columns,
          currentGroupByColumn: columns.length > 0 ? columns[0] : null,
        };
      }
      return state;
    },
    [query]
  );

  const [state, dispatch] = useReducer(storeReducer, initialState.current, createInitialState);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

const useDataPoolerStore = () => {
  const ctx = useContext(createStore());
  if (!ctx) {
    throw new Error('useDataPoolerStore must be used within a DataPoolerProvider');
  }
  return ctx as IStoreContext;
};

export const useDataPoolerDispatch = () => {
  const ctx = useDataPoolerStore();
  return ctx.dispatch;
};

export const useDataPoolerState = () => {
  const ctx = useDataPoolerStore();
  return ctx.state;
};
