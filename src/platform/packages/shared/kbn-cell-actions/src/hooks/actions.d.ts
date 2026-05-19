import type { PartitionedActions, CellAction } from '../types';
export declare const partitionActions: (actions: CellAction[], visibleCellActions: number) => {
    visibleActions: CellAction<import("../types").CellActionExecutionContext>[];
    extraActions: CellAction<import("../types").CellActionExecutionContext>[];
};
export declare const usePartitionActions: (allActions: CellAction[], visibleCellActions: number) => PartitionedActions;
