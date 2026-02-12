import type { StateContainer } from '@kbn/kibana-utils-plugin/common';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { StartContract } from '../plugin';
import type { State } from './dynamic_action_manager_state';
import type { ActionStorage } from './dynamic_action_storage';
import type { SerializedAction, SerializedEvent } from './types';
export type DynamicActionManagerState = State;
export interface DynamicActionManagerParams {
    storage: ActionStorage;
    uiActions: Pick<StartContract, 'registerAction' | 'attachAction' | 'unregisterAction' | 'detachAction' | 'hasAction' | 'getActionFactory' | 'hasActionFactory'>;
    isCompatible: (context: EmbeddableApiContext) => Promise<boolean>;
}
export declare class DynamicActionManager {
    protected readonly params: DynamicActionManagerParams;
    static idPrefixCounter: number;
    private readonly idPrefix;
    private stopped;
    private reloadSubscription?;
    /**
     * UI State of the dynamic action manager.
     */
    protected readonly ui: import("@kbn/kibana-utils-plugin/common").ReduxLikeStateContainer<State, import("./dynamic_action_manager_state").Transitions, import("./dynamic_action_manager_state").Selectors>;
    constructor(params: DynamicActionManagerParams);
    protected getEvent(eventId: string): SerializedEvent;
    /**
     * We prefix action IDs with a unique `.idPrefix`, so we can render the
     * same dashboard twice on the screen.
     */
    protected generateActionId(eventId: string): string;
    protected reviveAction(event: SerializedEvent): void;
    protected killAction({ eventId, triggers }: SerializedEvent): void;
    private syncId;
    /**
     * This function is called every time stored events might have changed not by
     * us. For example, when in edit mode on dashboard user presses "back" button
     * in the browser, then contents of storage changes.
     */
    private onSync;
    /**
     * Read-only state container of dynamic action manager. Use it to perform all
     * *read* operations.
     */
    readonly state: StateContainer<State>;
    /**
     * 1. Loads all events from  @type {DynamicActionStorage} storage.
     * 2. Creates actions for each event in `ui_actions` registry.
     * 3. Adds events to UI state.
     * 4. Does nothing if dynamic action manager was stopped or if event fetching
     *    is already taking place.
     */
    start(): Promise<void>;
    /**
     * 1. Removes all events from `ui_actions` registry.
     * 2. Puts dynamic action manager is stopped state.
     */
    stop(): Promise<void>;
    /**
     * Creates a new event.
     *
     * 1. Stores event in @type {DynamicActionStorage} storage.
     * 2. Optimistically adds it to UI state, and rolls back on failure.
     * 3. Adds action to `ui_actions` registry.
     *
     * @param action Dynamic action for which to create an event.
     * @param triggers List of triggers to which action should react.
     */
    createEvent(action: SerializedAction, triggers: string[]): Promise<void>;
    /**
     * Updates an existing event. Fails if event with given `eventId` does not
     * exit.
     *
     * 1. Updates the event in @type {DynamicActionStorage} storage.
     * 2. Optimistically replaces the old event by the new one in UI state, and
     *    rolls back on failure.
     * 3. Replaces action in `ui_actions` registry with the new event.
     *
     *
     * @param eventId ID of the event to replace.
     * @param action New action for which to create the event.
     * @param triggers List of triggers to which action should react.
     */
    updateEvent(eventId: string, action: SerializedAction, triggers: string[]): Promise<void>;
    /**
     * Removes existing event. Throws if event does not exist.
     *
     * 1. Removes the event from @type {DynamicActionStorage} storage.
     * 2. Optimistically removes event from UI state, and puts it back on failure.
     * 3. Removes associated action from `ui_actions` registry.
     *
     * @param eventId ID of the event to remove.
     */
    deleteEvent(eventId: string): Promise<void>;
    /**
     * Deletes multiple events at once.
     *
     * @param eventIds List of event IDs.
     */
    deleteEvents(eventIds: string[]): Promise<void>;
}
