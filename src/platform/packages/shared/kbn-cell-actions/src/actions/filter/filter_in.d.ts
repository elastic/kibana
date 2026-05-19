import type { FilterManager } from '@kbn/data-plugin/public';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DefaultActionsSupportedValue } from '../types';
export declare const createFilterInActionFactory: (params: {
    filterManager: FilterManager;
    notifications: NotificationsStart;
}) => import("../types").CellActionFactory<import("../../types").CellAction<import("../../types").CellActionExecutionContext>>;
export declare const addFilterIn: ({ filterManager, fieldName, value, dataViewId, }: {
    filterManager: FilterManager | undefined;
    fieldName: string;
    value: DefaultActionsSupportedValue;
    dataViewId?: string;
}) => void;
