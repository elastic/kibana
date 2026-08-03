import React, { type PropsWithChildren } from 'react';
import { type ActionsFromReducers } from './store';
import { type GroupNode, type LeafNode, type IStoreState, createStoreReducers } from './reducers';
export type { GroupNode, LeafNode, IStoreState, ColumnGroups } from './reducers';
export interface IDataCascadeProviderProps<G extends GroupNode> {
    cascadeGroups: string[];
    /**
     * The data to be displayed in the cascade. It should be an array of group nodes.
     */
    data: G[];
    initialGroupColumn?: string[];
    /**
     * Persisted restorable state used to seed the table on mount.
     * Only expanded and rowSelection are consumed by the provider.
     */
    initialState?: {
        expanded?: Record<string, boolean>;
        rowSelection?: Record<string, boolean>;
    };
}
interface IStoreContext<G extends GroupNode, L extends LeafNode> {
    state: IStoreState<G, L>;
    actions: Omit<
    /**
     * The actions from the store, the context consumers will receive excluding the _setStoreState action.
     * The _setStoreState action resets the entire store state, it should be used sparingly.
     */
    ActionsFromReducers<ReturnType<typeof createStoreReducers<G, L>>>, '_setStoreState'>;
}
export declare const createStoreContext: <G extends GroupNode, L extends LeafNode>() => React.Context<IStoreContext<G, L> | null>;
export declare function useDataCascadeActions<T extends GroupNode = GroupNode, L extends LeafNode = LeafNode>(): Omit<ActionsFromReducers<{
    readonly _setStoreState: (state: IStoreState<T, L>, payload: Omit<IStoreState<T, L>, "table" | "leafNodes">) => IStoreState<T, L>;
    readonly setInitialGroupNodes: (state: IStoreState<T, L>, payload: T[]) => IStoreState<T, L>;
    readonly setActiveCascadeGroups: (state: IStoreState<T, L>, payload: import("./reducers").ColumnGroups) => IStoreState<T, L>;
    readonly resetActiveCascadeGroups: (state: IStoreState<T, L>) => IStoreState<T, L>;
    readonly setRowGroupNodeData: (state: IStoreState<T, L>, payload: {
        id: string;
        data: T[];
    }) => IStoreState<T, L>;
    readonly setRowGroupLeafData: (state: IStoreState<T, L>, payload: {
        cacheKey: string;
        data: L[];
    }) => IStoreState<T, L>;
    readonly setExpandedRows: (state: IStoreState<T, L>, expandedState: import("@tanstack/table-core").ExpandedState) => IStoreState<T, L>;
    readonly setSelectedRows: (state: IStoreState<T, L>, selectedState: import("@tanstack/table-core").RowSelectionState) => IStoreState<T, L>;
}>, "_setStoreState">;
export declare function useDataCascadeState<G extends GroupNode, L extends LeafNode>(): IStoreState<G, L>;
export declare function useCascadeGroupNodes<G extends GroupNode, L extends LeafNode>(): G[];
export declare function useCascadeLeafNode<G extends GroupNode, L extends LeafNode>(cacheKey: string): L[];
export declare function DataCascadeProvider<G extends GroupNode, L extends LeafNode>({ cascadeGroups, initialGroupColumn, initialState, data: initialGroupNodes, children, }: PropsWithChildren<IDataCascadeProviderProps<G>>): React.JSX.Element;
