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
export interface UserActivityObject {
  /** Unique object identifier. */
  id: string;
  /** Object name. */
  name: string;
  /** Object type (for example, 'dashboard', 'case', 'rule'). */
  type: string;
  /** List of tags assigned to the object. */
  tags: string[];
}

/**
 * Event type following ECS (Elastic Common Schema) allowed values.
 * @see https://www.elastic.co/guide/en/ecs/1.12/ecs-allowed-values-event-type.html
 * @public
 */
export type UserActivityEventType =
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
 * Information about the event being performed by the user.
 * @public
 */
export interface UserActivityEvent {
  /** Descriptive action name, e.g., 'view_dashboard', 'edit_case', 'save_search' */
  action: string;
  /** Event type {@link UserActivityEventType}. */
  type: UserActivityEventType;
}

/** @public */
export interface TrackUserActionParams {
  /** Custom log message. If omitted, a default message is generated. */
  message?: string;
  /** Event attributes written to the log entry. */
  event: UserActivityEvent;
  /** Object attributes written to the log entry. */
  object: UserActivityObject;
}

/**
 * Allows plugins to record user actions.
 * Contextual information (user, session, space, IP) is automatically injected.
 *
 * @example
 * ```ts
 * core.userActivity.trackUserAction({
 *   event: { action: 'create_dashboard', type: 'creation' },
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
 * Allows plugins to record user actions.
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
