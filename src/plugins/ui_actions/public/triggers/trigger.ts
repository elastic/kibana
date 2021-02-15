/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
