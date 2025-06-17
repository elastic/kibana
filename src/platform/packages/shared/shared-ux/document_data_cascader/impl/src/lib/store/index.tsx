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
import { enableMapSet } from 'immer';
import { once } from 'lodash';
import {
  type GroupNode,
  type LeafNode,
  type IStoreState,
  type IDispatchAction,
  storeReducer,
} from './reducers';
import { getStatsGroupByColumnsFromQuery } from '../parse_esql';

interface IStoreContext<N extends GroupNode, L extends LeafNode> {
  state: IStoreState<N, L>;
  dispatch: Dispatch<IDispatchAction<N, L>>;
}

interface IDataCascadeProviderProps {
  query: string;
}

export const createStoreContext = once(<N extends GroupNode, L extends LeafNode>() => {
  enableMapSet(); // Enable Map and Set support for immer
  return createContext<IStoreContext<N, L> | null>(null);
});

export function DataCascadeProvider<N extends GroupNode, L extends LeafNode>({
  query,
  children,
}: PropsWithChildren<IDataCascadeProviderProps>) {
  const StoreContext = createStoreContext<N, L>();

  const initialState = useRef<IStoreContext<N, L>['state']>({
    groupNodes: [],
    leafNodes: new Map<string, L[]>(),
    currentQueryString: '',
    groupByColumns: [],
    currentGroupByColumns: [],
  });

  const createInitialState = useCallback(
    (state: IStoreContext<N, L>['state']): IStoreContext<N, L>['state'] => {
      if (query !== state.currentQueryString) {
        // TODO: Eyo - move this logic out of the provider so the component itself becomes even more generic
        const columns = getStatsGroupByColumnsFromQuery(query);
        return {
          ...state,
          currentQueryString: query,
          groupByColumns: columns,
          currentGroupByColumns: columns.length ? [columns[0]] : [],
        };
      }
      return state;
    },
    [query]
  );

  const [state, dispatch] = useReducer(storeReducer, initialState.current, createInitialState);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

function useDataCascadeStore<T extends GroupNode, L extends LeafNode>() {
  const ctx = useContext(createStoreContext<T, L>());
  if (!ctx) {
    throw new Error('useDataCascadeStore must be used within a DataCascadeProvider');
  }
  return ctx;
}

export function useDataCascadeDispatch<
  T extends GroupNode = GroupNode,
  L extends LeafNode = LeafNode
>() {
  const ctx = useDataCascadeStore<T, L>();
  return ctx.dispatch;
}

export function useDataCascadeState<T extends GroupNode, L extends LeafNode>() {
  const ctx = useDataCascadeStore<T, L>();
  return ctx.state;
}

export function useCascadeGroupNodes<T extends GroupNode, L extends LeafNode>() {
  const { groupNodes } = useDataCascadeState<T, L>();
  return groupNodes;
}

export function useCascadeLeafNode<T extends GroupNode, L extends LeafNode>(cacheKey: string[]) {
  const { leafNodes } = useDataCascadeState<T, L>();
  return leafNodes.get(cacheKey) ?? [];
}
