import type { AdditionalCellActionsParams } from '../types';
import { type AdditionalCellAction, type AdditionalCellActionContext, type DiscoverCellAction, type DiscoverCellActionExecutionContext, type DiscoverCellActionMetadata } from '../types';
export declare const DISCOVER_CELL_ACTION_TYPE = "discover-cellAction-type";
/**
 * Hook to register additional cell actions based on the resolved profiles
 * @param options Additional cell action options
 * @returns The current cell actions metadata
 */
export declare const useAdditionalCellActions: ({ dataSource, dataView, query, filters, timeRange, extensionActions, }: Omit<AdditionalCellActionContext, "field" | "value"> & {
    extensionActions?: AdditionalCellActionsParams["actions"];
}) => DiscoverCellActionMetadata;
export declare const createCellAction: (instanceId: string, action: AdditionalCellAction, order: number) => DiscoverCellAction;
export declare const toCellActionContext: ({ data, metadata, }: DiscoverCellActionExecutionContext) => AdditionalCellActionContext;
