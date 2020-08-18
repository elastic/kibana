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
import { TriggerId, TriggerContextMapping } from '../types';

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

    if (!actions.length) {
      throw new Error(
        `No compatible actions found to execute for trigger [triggerId = ${triggerId}].`
      );
    }

    await Promise.all([
      actions.map((action) =>
        this.service.executionService.execute({
          action,
          context,
          trigger: this.trigger,
        })
      ),
    ]);
  }
}
