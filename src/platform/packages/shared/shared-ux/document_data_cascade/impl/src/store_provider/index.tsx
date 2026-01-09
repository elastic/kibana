/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import { enableMapSet } from 'immer';
import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useCreateStore, type ActionsFromReducers } from './store';
import {
  type GroupNode,
  type LeafNode,
  type IStoreState,
  type TableState,
  createStoreReducers,
} from './reducers';
export type { GroupNode, LeafNode, IStoreState } from './reducers';

interface IDataCascadeProviderProps {
  initialGroupColumn?: string[];
  cascadeGroups: string[];
}

interface IStoreContext<G extends GroupNode, L extends LeafNode> {
  state: IStoreState<G, L>;
  actions: ActionsFromReducers<ReturnType<typeof createStoreReducers<G, L>>>;
}

export const createStoreContext = once(<G extends GroupNode, L extends LeafNode>() => {
  enableMapSet(); // Enable Map and Set support for immer
  return createContext<IStoreContext<G, L> | null>(null);
});

function useDataCascadeStore<G extends GroupNode, L extends LeafNode>() {
  const ctx = useContext(createStoreContext<G, L>());
  if (!ctx) {
    throw new Error('useDataCascadeStore must be used within a DataCascadeProvider');
  }
  return ctx;
}

export function useDataCascadeActions<
  T extends GroupNode = GroupNode,
  L extends LeafNode = LeafNode
>() {
  const ctx = useDataCascadeStore<T, L>();
  return ctx.actions;
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

export function DataCascadeProvider<G extends GroupNode, L extends LeafNode>({
  cascadeGroups,
  initialGroupColumn,
  children,
}: PropsWithChildren<IDataCascadeProviderProps>) {
  const StoreContext = createStoreContext<G, L>();
  const storeReducers = createStoreReducers<G, L>();

  const validatedInitialGroupColumn = useMemo(() => {
    if (!initialGroupColumn) return [];
    return initialGroupColumn.filter((col) => cascadeGroups.includes(col));
  }, [initialGroupColumn, cascadeGroups]);

  const { state, actions } = useCreateStore({
    initialState: {
      table: {} as TableState,
      groupNodes: [] as G[],
      leafNodes: new Map<string, L[]>(), // TODO: consider externalizing this so the consumer might provide their own external cache
      groupByColumns: cascadeGroups,
      currentGroupByColumns: cascadeGroups.length
        ? validatedInitialGroupColumn.length
          ? validatedInitialGroupColumn
          : [cascadeGroups[0]]
        : [],
    },
    reducers: storeReducers,
  });

  return <StoreContext.Provider value={{ state, actions }}>{children}</StoreContext.Provider>;
}
