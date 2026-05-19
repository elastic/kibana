import type { NotificationsStart } from '@kbn/core/public';
export declare const createCopyToClipboardActionFactory: (params: {
    notifications: NotificationsStart;
}) => import("..").CellActionFactory<import("../../types").CellAction<import("../../types").CellActionExecutionContext>>;
