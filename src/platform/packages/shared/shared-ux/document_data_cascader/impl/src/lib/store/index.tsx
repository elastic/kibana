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
import { type DocWithId, type IStoreState, type IDispatchAction, storeReducer } from './reducers';
import { getStatsGroupByColumnsFromQuery } from '../parse_esql';

interface IStoreContext<T extends DocWithId> {
  state: IStoreState<T>;
  dispatch: Dispatch<IDispatchAction>;
}

interface IDataCascadeProviderProps {
  query: string;
}

export const createStoreContext = once(<T extends DocWithId>() => {
  return createContext<IStoreContext<T> | null>(null);
});

export function DataCascadeProvider<T extends DocWithId>({
  query,
  children,
}: PropsWithChildren<IDataCascadeProviderProps>) {
  const StoreContext = createStoreContext<T>();

  const initialState = useRef<IStoreContext<T>['state']>({
    data: [],
    currentQueryString: '',
    groupByColumns: null,
    currentGroupByColumn: null,
  });

  const createInitialState = useCallback(
    (state: IStoreContext<T>['state']) => {
      if (query !== state.currentQueryString) {
        // TODO: Eyo - move this logic out of the provider so the component itself becomes even more generic
        const columns = getStatsGroupByColumnsFromQuery(query);
        return {
          ...state,
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

function useDataCascadeStore<T extends DocWithId>() {
  const ctx = useContext(createStoreContext<T>());
  if (!ctx) {
    throw new Error('useDataCascadeStore must be used within a DataCascadeProvider');
  }
  return ctx;
}

export function useDataCascadeDispatch<T extends DocWithId = DocWithId>() {
  const ctx = useDataCascadeStore<T>();
  return ctx.dispatch;
}

export function useDataCascadeState<T extends DocWithId>() {
  const ctx = useDataCascadeStore<T>();
  return ctx.state;
}
