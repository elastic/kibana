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

import { TriggerRegistry, ActionRegistry } from '../types';
import { Action } from '../actions';

export class UiActionsService {
  constructor(
    private readonly triggers: TriggerRegistry = new Map(),
    private readonly actions: ActionRegistry = new Map()
  ) {}

  registerAction = (action: Action) => {
    if (this.actions.has(action.id)) {
      throw new Error(`Action [action.id = ${action.id}] already registered.`);
    }

    this.actions.set(action.id, action);
  };

  /**
   * "Fork" a separate instance of `UiActionsService` that inherits all existing
   * triggers and actions, but going forward all new triggers and actions added
   * to this instance of `UiActionsService` are only available within this instance.
   */
  fork = (): UiActionsService => {
    const triggers: TriggerRegistry = new Map();
    const actions: ActionRegistry = new Map();

    for (const [key, value] of this.triggers.entries()) triggers.set(key, value);
    for (const [key, value] of this.actions.entries()) actions.set(key, value);

    return new UiActionsService(triggers, actions);
  };
}
