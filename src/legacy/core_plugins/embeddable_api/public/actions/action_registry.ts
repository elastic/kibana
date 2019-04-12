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

import { Action } from './action';
import { Embeddable } from '../embeddables';
import { Container } from '../containers';
import { triggerRegistry } from '../triggers';

class ActionRegistry {
  private actions: { [key: string]: Action } = {};

  public addAction(action: Action) {
    if (this.getAction(action.id)) {
      throw new Error('Action already exists');
    }
    this.actions[action.id] = action;
  }

  public getAction(id: string) {
    return this.actions[id];
  }

  public removeAction(id: string) {
    delete this.actions[id];
  }

  public getActions() {
    return this.actions;
  }

  public reset() {
    this.actions = {};
  }

  public async getActionsForTrigger(
    triggerId: string,
    context: { embeddable: Embeddable; container?: Container }
  ) {
    const trigger = triggerRegistry.getTrigger(triggerId);

    if (!trigger) {
      throw new Error(`Trigger with id ${triggerId} does not exist`);
    }

    const actions: Action[] = [];
    const promises = trigger.actionIds.map(async id => {
      const action = actionRegistry.getAction(id);
      if (!action) {
        throw new Error(`Action ${id} does not exist`);
      }
      if (!context || (await action.isCompatible(context))) {
        actions.push(action);
      }
    });

    await Promise.all(promises);

    return actions;
  }
}

export const actionRegistry = new ActionRegistry();
