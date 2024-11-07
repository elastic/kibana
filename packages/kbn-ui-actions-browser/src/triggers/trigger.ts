/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export interface Trigger {
  /**
   * Unique name of the trigger as identified in `ui_actions` plugin trigger registry.
   */
  id: string;

  /**
   * User friendly name of the trigger.
   */
  title?: string;

  /**
   * A longer user friendly description of the trigger.
   */
  description?: string;
}
