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
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useCreateStore, type ActionsFromReducers } from './store';
import {
  type GroupNode,
  type LeafNode,
  type IStoreState,
  type TableState,
  createStoreReducers,
} from './reducers';
export type { GroupNode, LeafNode, IStoreState, ColumnGroups } from './reducers';

export interface IDataCascadeProviderProps<G extends GroupNode> {
  cascadeGroups: string[];
  /**
   * The data to be displayed in the cascade. It should be an array of group nodes.
   */
  data: G[];
  initialGroupColumn?: string[];
  /**
   * Properties to set the initial table state on mount.
   * Only expanded and rowSelection properties are supported for now.
   */
  initialTableState?: Pick<Partial<TableState>, 'expanded' | 'rowSelection'>;
}

interface IStoreContext<G extends GroupNode, L extends LeafNode> {
  state: IStoreState<G, L>;
  actions: Omit<
    /**
     * The actions from the store, the context consumers will receive excluding the _setStoreState action.
     * The _setStoreState action resets the entire store state, it should be used sparingly.
     */
    ActionsFromReducers<ReturnType<typeof createStoreReducers<G, L>>>,
    '_setStoreState'
  >;
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
  initialTableState,
  data: initialGroupNodes,
  children,
}: PropsWithChildren<IDataCascadeProviderProps<G>>) {
  const StoreContext = useMemo(() => createStoreContext<G, L>(), []);
  const storeReducers = useMemo(() => createStoreReducers<G, L>(), []);

  const validatedInitialGroupColumn = useMemo(() => {
    if (!initialGroupColumn) return [cascadeGroups[0]];
    return initialGroupColumn.filter((col) => cascadeGroups.includes(col));
  }, [initialGroupColumn, cascadeGroups]);

  const initialState = useMemo<IStoreState<G, L>>(
    () => ({
      table: (initialTableState ?? {}) as TableState,
      groupNodes: initialGroupNodes,
      leafNodes: new Map<string, L[]>(), // TODO: consider externalizing this so the consumer might provide their own external cache
      groupByColumns: cascadeGroups,
      currentGroupByColumns: validatedInitialGroupColumn.length ? validatedInitialGroupColumn : [],
    }),
    [initialGroupNodes, initialTableState, cascadeGroups, validatedInitialGroupColumn]
  );

  const { state, actions } = useCreateStore({
    initialState,
    reducers: storeReducers,
  });

  useEffect(() => {
    const columnsChanged =
      state.groupByColumns.length !== cascadeGroups.length ||
      state.groupByColumns.some((column) => !cascadeGroups.includes(column));

    const groupNodesChanged = state.groupNodes !== initialGroupNodes;

    if (columnsChanged || groupNodesChanged) {
      actions._setStoreState({
        groupNodes: initialGroupNodes,
        groupByColumns: cascadeGroups,
        currentGroupByColumns: validatedInitialGroupColumn.length
          ? validatedInitialGroupColumn
          : [],
      });
      return;
    }
  }, [
    actions,
    cascadeGroups,
    initialGroupNodes,
    state.groupByColumns,
    state.groupNodes,
    validatedInitialGroupColumn,
  ]);

  const contextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return <StoreContext.Provider value={contextValue}>{children}</StoreContext.Provider>;
}
