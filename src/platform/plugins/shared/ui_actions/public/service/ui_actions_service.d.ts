import type { Trigger, ActionRegistry, TriggerToActionsRegistry } from '../types';
import type { Action, ActionDefinition, FrequentCompatibilityChangeAction } from '../actions';
import { UiActionsExecutionService } from './ui_actions_execution_service';
export interface UiActionsServiceParams {
    readonly actions?: ActionRegistry;
    /**
     * A 1-to-N mapping from `Trigger` to zero or more `Action`.
     */
    readonly triggerToActions?: TriggerToActionsRegistry;
}
export declare class UiActionsService {
    readonly executionService: UiActionsExecutionService;
    protected readonly actions: ActionRegistry;
    protected readonly triggerToActions: TriggerToActionsRegistry;
    constructor({ actions, triggerToActions }?: UiActionsServiceParams);
    readonly getTrigger: (triggerId: string) => Trigger;
    readonly registerActionAsync: <Context extends object>(id: string, getDefinition: () => Promise<ActionDefinition<Context>>) => void;
    readonly unregisterAction: (actionId: string) => void;
    readonly hasAction: (actionId: string) => boolean;
    readonly attachAction: (triggerId: string, actionId: string) => void;
    readonly detachAction: (triggerId: string, actionId: string) => void;
    /**
     * `addTriggerActionAsync` is similar to `attachAction` as it attaches action to a
     * trigger, but it also registers the action, if it has not been registered, yet.
     */
    readonly addTriggerActionAsync: (triggerId: string, actionId: string, getDefinition: () => Promise<ActionDefinition<any>>) => void;
    readonly getAction: (id: string) => Promise<Action>;
    readonly getTriggerActions: (triggerId: string) => Promise<Action[]>;
    readonly getTriggerCompatibleActions: (triggerId: string, context: object) => Promise<Action[]>;
    readonly getFrequentlyChangingActionsForTrigger: (triggerId: string, context: object) => Promise<FrequentCompatibilityChangeAction[]>;
    readonly executeTriggerActions: (triggerId: string, context: object, alwaysShowPopup?: boolean) => Promise<void>;
    /**
     * Removes all registered triggers and actions.
     */
    readonly clear: () => void;
    /**
     * "Fork" a separate instance of `UiActionsService` that inherits all existing
     * triggers and actions, but going forward all new triggers and actions added
     * to this instance of `UiActionsService` are only available within this instance.
     */
    readonly fork: () => UiActionsService;
}
