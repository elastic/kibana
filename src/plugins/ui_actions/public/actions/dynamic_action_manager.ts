/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { v4 as uuidv4 } from 'uuid';
import { Subscription } from 'rxjs';
import { ActionStorage, SerializedEvent } from './dynamic_action_storage';
import { UiActionsService } from '../service';
import { SerializedAction } from './types';
import { ActionDefinition } from './action';
import { defaultState, transitions, selectors, State } from './dynamic_action_manager_state';
import { StateContainer, createStateContainer } from '../../../kibana_utils';

const compareEvents = (
  a: ReadonlyArray<{ eventId: string }>,
  b: ReadonlyArray<{ eventId: string }>
) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].eventId !== b[i].eventId) return false;
  return true;
};

export type DynamicActionManagerState = State;

export interface DynamicActionManagerParams {
  storage: ActionStorage;
  uiActions: Pick<
    UiActionsService,
    'addTriggerAction' | 'removeTriggerAction' | 'getActionFactory'
  >;
  isCompatible: <C = unknown>(context: C) => Promise<boolean>;
}

export class DynamicActionManager {
  static idPrefixCounter = 0;

  private readonly idPrefix = `D_ACTION_${DynamicActionManager.idPrefixCounter++}_`;
  private stopped: boolean = false;
  private reloadSubscription?: Subscription;

  /**
   * UI State of the dynamic action manager.
   */
  protected readonly ui = createStateContainer(defaultState, transitions, selectors);

  constructor(protected readonly params: DynamicActionManagerParams) {}

  protected getEvent(eventId: string): SerializedEvent {
    const oldEvent = this.ui.selectors.getEvent(eventId);
    if (!oldEvent) throw new Error(`Could not find event [eventId = ${eventId}].`);
    return oldEvent;
  }

  /**
   * We prefix action IDs with a unique `.idPrefix`, so we can render the
   * same dashboard twice on the screen.
   */
  protected generateActionId(eventId: string): string {
    return this.idPrefix + eventId;
  }

  protected reviveAction(event: SerializedEvent) {
    const { eventId, triggerId, action } = event;
    const { uiActions, isCompatible } = this.params;
    const { name } = action;

    const actionId = this.generateActionId(eventId);
    const factory = uiActions.getActionFactory(event.action.factoryId);
    const actionDefinition: ActionDefinition<any> = {
      ...factory.create(action as SerializedAction<object>),
      id: actionId,
      isCompatible,
      getDisplayName: () => name,
    };

    uiActions.addTriggerAction(triggerId as any, actionDefinition);
  }

  protected killAction({ eventId, triggerId }: SerializedEvent) {
    const { uiActions } = this.params;
    const actionId = this.generateActionId(eventId);
    uiActions.removeTriggerAction(triggerId as any, actionId);
  }

  private syncId = 0;

  /**
   * This function is called every time stored events might have changed not by
   * us. For example, when in edit mode on dashboard user presses "back" button
   * in the browser, then contents of storage changes.
   */
  private onSync = () => {
    if (this.stopped) return;

    (async () => {
      const syncId = ++this.syncId;
      const events = await this.params.storage.list();

      if (this.stopped) return;
      if (syncId !== this.syncId) return;
      if (compareEvents(events, this.ui.get().events)) return;

      for (const event of this.ui.get().events) this.killAction(event);
      for (const event of events) this.reviveAction(event);
      this.ui.transitions.finishFetching(events);
    })().catch(error => {
      /* eslint-disable */
      console.log('Dynamic action manager storage reload failed.');
      console.error(error);
      /* eslint-enable */
    });
  };

  // Public API: ---------------------------------------------------------------

  /**
   * Read-only state container of dynamic action manager. Use it to perform all
   * *read* operations.
   */
  public readonly state: StateContainer<State> = this.ui;

  /**
   * 1. Loads all events from  @type {DynamicActionStorage} storage.
   * 2. Creates actions for each event in `ui_actions` registry.
   * 3. Adds events to UI state.
   * 4. Does nothing if dynamic action manager was stopped of if event fetching
   *    is already taking place.
   */
  public async start() {
    if (this.stopped) return;
    if (this.ui.get().isFetchingEvents) return;

    this.ui.transitions.startFetching();
    const events = await this.params.storage.list();
    for (const event of events) this.reviveAction(event);
    this.ui.transitions.finishFetching(events);

    if (this.params.storage.reload$) {
      this.reloadSubscription = this.params.storage.reload$.subscribe(this.onSync);
    }
  }

  /**
   * 1. Removes all events from `ui_actions` registry.
   * 2. Puts dynamic action manager is stopped state.
   */
  public async stop() {
    this.stopped = true;
    const events = await this.params.storage.list();

    for (const event of events) {
      this.killAction(event);
    }

    if (this.reloadSubscription) {
      this.reloadSubscription.unsubscribe();
    }
  }

  /**
   * Creates a new event.
   *
   * 1. Stores event in @type {DynamicActionStorage} storage.
   * 2. Optimistically adds it to UI state, and rolls back on failure.
   * 3. Adds action to `ui_actions` registry.
   *
   * @todo `triggerId` should not be optional.
   *
   * @param action Dynamic action for which to create an event.
   * @param triggerId Trigger to which to attach the action.
   */
  public async createEvent(action: SerializedAction<unknown>, triggerId = 'VALUE_CLICK_TRIGGER') {
    const event: SerializedEvent = {
      eventId: uuidv4(),
      triggerId,
      action,
    };

    this.ui.transitions.addEvent(event);
    try {
      await this.params.storage.create(event);
      this.reviveAction(event);
    } catch {
      this.ui.transitions.removeEvent(event.eventId);
    }
  }

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
   * @param triggerId New trigger with which to associate the event.
   */
  public async updateEvent(
    eventId: string,
    action: SerializedAction<unknown>,
    triggerId = 'VALUE_CLICK_TRIGGER'
  ) {
    const event: SerializedEvent = {
      eventId,
      triggerId,
      action,
    };

    const oldEvent = this.getEvent(eventId);
    this.killAction(oldEvent);

    this.reviveAction(event);
    this.ui.transitions.replaceEvent(event);

    try {
      await this.params.storage.update(event);
    } catch {
      this.killAction(event);
      this.reviveAction(oldEvent);
      this.ui.transitions.replaceEvent(oldEvent);
    }
  }

  /**
   * Removes existing event. Throws if event does not exist.
   *
   * 1. Removes the event from @type {DynamicActionStorage} storage.
   * 2. Optimistically removes event from UI state, and puts it back on failure.
   * 3. Removes associated action from `ui_actions` registry.
   *
   * @param eventId ID of the event to remove.
   */
  public async deleteEvent(eventId: string) {
    const event = this.getEvent(eventId);

    this.killAction(event);
    this.ui.transitions.removeEvent(eventId);

    try {
      await this.params.storage.remove(eventId);
    } catch {
      this.reviveAction(event);
      this.ui.transitions.addEvent(event);
    }
  }

  /**
   * Deletes multiple events at once.
   *
   * @param eventIds List of event IDs.
   */
  public async deleteEvents(eventIds: string[]) {
    await Promise.all(eventIds.map(this.deleteEvent.bind(this)));
  }

  /**
   * @deprecated
   *
   * Use `.state.get().events` instead.
   */
  public async list(): Promise<readonly SerializedEvent[]> {
    return this.state.get().events;
  }

  /**
   * @deprecated
   *
   * Use `.state.get().events.length` instead.
   */
  public async count(): Promise<number> {
    return this.state.get().events.length;
  }
}
