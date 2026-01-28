/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Information about the object being acted upon.
 * @public
 */
export interface ObjectParams {
  /** Unique identifier of the object */
  id: string;
  /** Display name of the object */
  name: string;
  /** Object type, e.g., 'dashboard', 'visualization', 'lens' */
  type: string;
  /** Tags associated with the object */
  tags: string[];
}

/**
 * Event type following ECS (Elastic Common Schema) allowed values.
 * @see https://www.elastic.co/guide/en/ecs/1.12/ecs-allowed-values-event-type.html
 */
type EventType =
  | 'access'
  | 'admin'
  | 'allowed'
  | 'change'
  | 'connection'
  | 'creation'
  | 'deletion'
  | 'denied'
  | 'end'
  | 'error'
  | 'group'
  | 'indicator'
  | 'info'
  | 'installation'
  | 'protocol'
  | 'start'
  | 'user';

/**
 * Information about the action being performed.
 * @public
 */
export interface EventParams {
  /** Descriptive action name, e.g., 'view_dashboard', 'edit_case', 'save_search' */
  action: string;
  /** ECS event type categorizing the action */
  type: EventType;
}

/**
 * Parameters for tracking a user action.
 * @public
 */
export interface TrackUserActionParams {
  /** Custom log message. If omitted, a default message is generated. */
  message?: string;
  /** Information about the action being performed */
  event: EventParams;
  /** Information about the object being acted upon */
  object: ObjectParams;
}

/**
 * Allows plugins to record user actions for auditing and compliance.
 * Contextual information (user, session, space, IP) is automatically injected.
 *
 * @example
 * ```ts
 * core.userActivity.trackUserAction({
 *   event: { action: 'create', type: 'creation' },
 *   object: { id: 'dash-123', name: 'My Dashboard', type: 'dashboard', tags: [] },
 * });
 * ```
 * @public
 */
export interface UserActivityServiceSetup {
  /**
   * Records a user action, automatically enriched with user/session/space context.
   * @param params {@link TrackUserActionParams}
   */
  trackUserAction(params: TrackUserActionParams): void;
}

/**
 * Allows plugins to record user actions for auditing and compliance.
 * Contextual information (user, session, space, IP) is automatically injected.
 * @public
 */
export interface UserActivityServiceStart {
  /**
   * Records a user action, automatically enriched with user/session/space context.
   * @param params {@link TrackUserActionParams}
   */
  trackUserAction(params: TrackUserActionParams): void;
}
