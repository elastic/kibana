import type { Trigger } from '../types';
import type { Action } from '../actions';
export declare class UiActionsExecutionService {
    private readonly batchingQueue;
    private readonly pendingTasks;
    constructor();
    execute({ action, context, trigger, }: {
        action: Action;
        context: object;
        trigger: Trigger;
    }, alwaysShowPopup?: boolean): Promise<void>;
    private scheduleFlush;
    private executeSingleTask;
    private showActionPopupMenu;
}
