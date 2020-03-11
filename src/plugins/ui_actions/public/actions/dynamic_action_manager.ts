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
import { ActionStorage, SerializedEvent } from './dynamic_action_storage';
import { UiActionsService } from '../service';
import { SerializedAction } from './types';
import { ActionDefinition } from './action';

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

  constructor(protected readonly params: DynamicActionManagerParams) {}

  protected generateActionId(eventId: string): string {
    return this.idPrefix + eventId;
  }

  public async start() {
    const events = await this.params.storage.list();

    for (const event of events) {
      this.reviveAction(event);
    }
  }

  public async stop() {
    const events = await this.params.storage.list();

    for (const event of events) {
      this.killAction(event);
    }
  }

  public async createEvent(action: SerializedAction<unknown>, triggerId = 'VALUE_CLICK_TRIGGER') {
    const event: SerializedEvent = {
      eventId: uuidv4(),
      triggerId,
      action,
    };

    await this.params.storage.create(event);
    this.reviveAction(event);
  }

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

    const oldEvent = await this.params.storage.read(eventId);
    this.killAction(oldEvent);
    await this.params.storage.update(event);
    this.reviveAction(event);
  }

  public async deleteEvents(eventIds: string[]) {
    const eventsToKill = (await this.params.storage.list()).filter(event =>
      eventIds.includes(event.eventId)
    );
    await Promise.all(eventIds.map(eventId => this.params.storage.remove(eventId)));
    eventsToKill.forEach(event => this.killAction(event));
  }

  public async list(): Promise<SerializedEvent[]> {
    return await this.params.storage.list();
  }

  public async count(): Promise<number> {
    return await this.params.storage.count();
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
      // TODO: Factory and action have different contexts.
      getIconType: context => factory.getIconType(context),
    };

    uiActions.addTriggerAction(triggerId as any, actionDefinition);
  }

  protected killAction({ eventId, triggerId }: SerializedEvent) {
    const { uiActions } = this.params;
    const actionId = this.generateActionId(eventId);
    uiActions.removeTriggerAction(triggerId as any, actionId);
  }
}
