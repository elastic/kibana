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

import { TriggerContext, Trigger } from './trigger';
import { TriggerContract } from './trigger_contract';
import { UiActionsService } from '../service';
import { Action } from '../actions';
import { buildContextMenuForActions, openContextMenu } from '../context_menu';
import { TriggerId } from '../types';

/**
 * Internal representation of a trigger kept for consumption only internally
 * within `ui_actions` plugin.
 */
export class TriggerInternal<T extends TriggerId> {
  public readonly contract = new TriggerContract<T>(this);

  constructor(public readonly service: UiActionsService, public readonly trigger: Trigger<T>) {}

  public async execute(context: TriggerContext<T>) {
    const triggerId = this.trigger.id;
    const actions = await this.service.getTriggerCompatibleActions!(triggerId, context);

    if (!actions.length) {
      throw new Error(
        `No compatible actions found to execute for trigger [triggerId = ${triggerId}].`
      );
    }

    if (actions.length === 1) {
      await this.executeSingleAction(actions[0], context);
      return;
    }

    await this.executeMultipleActions(actions, context);
  }

  private async executeSingleAction(action: Action<TriggerContext<T>>, context: TriggerContext<T>) {
    const href = action.getHref && action.getHref(context);

    if (href) {
      window.location.href = href;
      return;
    }

    await action.execute(context);
  }

  private async executeMultipleActions(
    actions: Array<Action<TriggerContext<T>>>,
    context: TriggerContext<T>
  ) {
    const panel = await buildContextMenuForActions({
      actions,
      actionContext: context,
      closeMenu: () => session.close(),
    });
    const session = openContextMenu([panel]);
  }
}
