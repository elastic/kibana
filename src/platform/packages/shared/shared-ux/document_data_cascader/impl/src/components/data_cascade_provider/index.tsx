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
export type { GroupNode, LeafNode, IStoreState, IDispatchAction } from './reducers';
export { storeReducer } from './reducers';

interface IStoreContext<G extends GroupNode, L extends LeafNode> {
  state: IStoreState<G, L>;
  dispatch: Dispatch<IDispatchAction<G, L>>;
}

interface IDataCascadeProviderProps {
  cascadeGroups: string[];
}

export const createStoreContext = once(<G extends GroupNode, L extends LeafNode>() => {
  enableMapSet(); // Enable Map and Set support for immer
  return createContext<IStoreContext<G, L> | null>(null);
});

export function DataCascadeProvider<G extends GroupNode, L extends LeafNode>({
  cascadeGroups,
  children,
}: PropsWithChildren<IDataCascadeProviderProps>) {
  const StoreContext = createStoreContext<G, L>();

  type StoreContextState = IStoreContext<G, L>['state'];

  const initialState = useRef<StoreContextState>({
    groupNodes: [],
    leafNodes: new Map<string, L[]>(), // TODO: consider externalizing this so the consumer might provide their own external cache
    groupByColumns: [],
    currentGroupByColumns: [],
  });

  const createInitialState = useCallback(
    (state: StoreContextState): StoreContextState => {
      return {
        ...state,
        groupByColumns: cascadeGroups,
        currentGroupByColumns: cascadeGroups.length ? [cascadeGroups[0]] : [],
      };
    },
    [cascadeGroups]
  );

  const [state, dispatch] = useReducer(storeReducer, initialState.current, createInitialState);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

function useDataCascadeStore<G extends GroupNode, L extends LeafNode>() {
  const ctx = useContext(createStoreContext<G, L>());
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

export function useDataCascadeState<G extends GroupNode, L extends LeafNode>() {
  const ctx = useDataCascadeStore<G, L>();
  return ctx.state;
}

export function useCascadeGroupNodes<G extends GroupNode, L extends LeafNode>() {
  const { groupNodes } = useDataCascadeState<G, L>();
  return groupNodes;
}

export function useCascadeLeafNode<G extends GroupNode, L extends LeafNode>(cacheKey: string) {
  const { leafNodes } = useDataCascadeState<G, L>();
  return leafNodes.get(cacheKey) ?? [];
}
