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

import { TriggerInternal } from './trigger_internal';
import { TriggerId, TriggerContextMapping } from '../types';

/**
 * This is a public representation of a trigger that is provided to other plugins.
 */
export class TriggerContract<T extends TriggerId> {
  /**
   * Unique name of the trigger as identified in `ui_actions` plugin trigger
   * registry, such as "SELECT_RANGE_TRIGGER" or "VALUE_CLICK_TRIGGER".
   */
  public readonly id: T;

  /**
   * User friendly name of the trigger.
   */
  public readonly title?: string;

  /**
   * A longer user friendly description of the trigger.
   */
  public readonly description?: string;

  constructor(private readonly internal: TriggerInternal<T>) {
    this.id = this.internal.trigger.id;
    this.title = this.internal.trigger.title;
    this.description = this.internal.trigger.description;
  }

  /**
   * Use this method to execute action attached to this trigger.
   */
  public readonly exec = async (context: TriggerContextMapping[T], alwaysShowPopup?: boolean) => {
    await this.internal.execute(context, alwaysShowPopup);
  };
}
