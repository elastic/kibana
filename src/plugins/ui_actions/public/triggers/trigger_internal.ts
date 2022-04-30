/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Trigger } from './trigger';
import { TriggerContract } from './trigger_contract';
import { UiActionsService } from '../service';

/**
 * Internal representation of a trigger kept for consumption only internally
 * within `ui_actions` plugin.
 */
export class TriggerInternal<Context extends object = object> {
  public readonly contract: TriggerContract<Context>;

  constructor(public readonly service: UiActionsService, public readonly trigger: Trigger) {
    this.contract = new TriggerContract<Context>(this);
  }

  public async execute(context: Context, alwaysShowPopup?: boolean) {
    const triggerId = this.trigger.id;
    const actions = await this.service.getTriggerCompatibleActions!(triggerId, context);

    await Promise.all([
      actions.map((action) =>
        this.service.executionService.execute(
          {
            action,
            context,
            trigger: this.trigger,
          },
          alwaysShowPopup
        )
      ),
    ]);
  }
}
