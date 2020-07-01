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

import { Trigger } from './trigger';
import { TriggerContract } from './trigger_contract';
import { UiActionsService } from '../service';
import { Action } from '../actions';
import { buildContextMenuForActions, openContextMenu } from '../context_menu';
import { TriggerId, TriggerContextMapping, BaseContext } from '../types';

export type ActionContextTuple = [Action, BaseContext];

/**
 * Internal representation of a trigger kept for consumption only internally
 * within `ui_actions` plugin.
 */
export class TriggerInternal<T extends TriggerId> {
  public readonly contract = new TriggerContract<T>(this);

  constructor(public readonly service: UiActionsService, public readonly trigger: Trigger<T>) {}

  public async execute(context: TriggerContextMapping[T]) {
    const triggerId = this.trigger.id;
    const actions = await this.service.getTriggerCompatibleActions!(triggerId, context);

    const actionsWithContexts: ActionContextTuple[] = actions.map((action) => [action, context]);

    // TODO: make this recursive
    const triggerReactions = this.service.getTriggerReactions(triggerId);
    for (const reaction of triggerReactions) {
      if (await reaction.isCompatible(context)) {
        const reactionContext = await reaction.originContextToDestContext(context);
        const reactionActions = await this.service.getTriggerCompatibleActions(
          reaction.destTrigger,
          reactionContext
        );
        const reactionActionsWithContext = reactionActions.map((reactionAction) => [
          reactionAction,
          reactionContext,
        ]);
        actionsWithContexts.push(...(reactionActionsWithContext as ActionContextTuple[]));
      }
    }

    if (!actionsWithContexts.length) {
      throw new Error(
        `No compatible actions found to execute for trigger [triggerId = ${triggerId}].`
      );
    }

    if (actionsWithContexts.length === 1) {
      await this.executeSingleAction(actionsWithContexts[0]);
      return;
    }

    await this.executeMultipleActions(actionsWithContexts);
  }

  private async executeSingleAction([action, context]: ActionContextTuple) {
    await action.execute(context);
  }

  private async executeMultipleActions(actionsWithContext: ActionContextTuple[]) {
    const panel = await buildContextMenuForActions({
      actionsWithContext,
      title: this.trigger.title,
      closeMenu: () => session.close(),
    });
    const session = openContextMenu([panel], {
      'data-test-subj': 'multipleActionsContextMenu',
    });
  }
}
