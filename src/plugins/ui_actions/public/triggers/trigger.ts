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

import { TriggerContextMapping, TriggerId } from '../types';

/**
 * This is a convenience interface used to register a *trigger*.
 *
 * `Trigger` specifies a named anchor to which `Action` can be attached. When
 * `Trigger` is being *called* it creates a `Context` object and passes it to
 * the `execute` method of an `Action`.
 *
 * More than one action can be attached to a single trigger, in which case when
 * trigger is *called* it first displays a context menu for user to pick a
 * single action to execute.
 */
export interface Trigger<ID extends TriggerId = TriggerId> {
  /**
   * Unique name of the trigger as identified in `ui_actions` plugin trigger
   * registry, such as "SELECT_RANGE_TRIGGER" or "VALUE_CLICK_TRIGGER".
   */
  id: ID;

  /**
   * User friendly name of the trigger.
   */
  title?: string;

  /**
   * A longer user friendly description of the trigger.
   */
  description?: string;
}

export type TriggerContext<T> = T extends TriggerId ? TriggerContextMapping[T] : never;
