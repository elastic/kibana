import type { TableState, ExpandedState, RowSelectionState } from '@tanstack/react-table';
export type { TableState };
/**
 * Represents a document, with a base expectation that specifies
 * that it has a unique identifier.
 */
type DocWithId = Record<string, any> & {
    id: string;
};
/**
 * Represents a group node, with a base expectation that it is a document with a unique identifier, with specific properties.
 * It can also have children, which are other group nodes.
 */
export type GroupNode = DocWithId & {
    children?: GroupNode[];
};
export type LeafNode = DocWithId;
export type ColumnGroups = Array<keyof Omit<GroupNode, 'children' | 'id'>>;
export interface IStoreState<G extends GroupNode, L extends LeafNode> {
    readonly table: TableState;
    /**
     * Record of group nodes that can be displayed in the table.
     */
    readonly groupNodes: G[];
    /**
     * Record of leaf nodes that can be displayed in the table.
     */
    readonly leafNodes: Map<string, L[]>;
    /**
     * The available columns that can be used to group the data.
     */
    readonly groupByColumns: ColumnGroups;
    /**
     * The currently selected group by column. in the order in which they are nested
     */
    readonly currentGroupByColumns: ColumnGroups;
}
export declare function createStoreReducers<G extends GroupNode, L extends LeafNode>(): {
    /**
     * This action is used to set the entire store state, it should be used sparingly.
     */
    readonly _setStoreState: (state: IStoreState<G, L>, payload: Omit<IStoreState<G, L>, "table" | "leafNodes">) => IStoreState<G, L>;
    readonly setInitialGroupNodes: (state: IStoreState<G, L>, payload: G[]) => IStoreState<G, L>;
    readonly setActiveCascadeGroups: (state: IStoreState<G, L>, payload: ColumnGroups) => IStoreState<G, L>;
    readonly resetActiveCascadeGroups: (state: IStoreState<G, L>) => IStoreState<G, L>;
    readonly setRowGroupNodeData: (state: IStoreState<G, L>, payload: {
        id: string;
        data: G[];
    }) => IStoreState<G, L>;
    readonly setRowGroupLeafData: (state: IStoreState<G, L>, payload: {
        cacheKey: string;
        data: L[];
    }) => IStoreState<G, L>;
    readonly setExpandedRows: (state: IStoreState<G, L>, expandedState: ExpandedState) => IStoreState<G, L>;
    readonly setSelectedRows: (state: IStoreState<G, L>, selectedState: RowSelectionState) => IStoreState<G, L>;
};
