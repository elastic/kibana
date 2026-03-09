/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserActivityActionId } from './user_activity_actions';

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
  action: UserActivityActionId;
  /** Event type {@link UserActivityEventType}. */
  type: UserActivityEventType;
  /** ISO8601 timestamp of the event start time. */
  start?: string;
  /** ISO8601 timestamp of the event end time. */
  end?: string;
  /** Duration (in ns) between the event start and end timestamps. */
  duration?: number;
}

/** @public */
export interface UserActivityUserInputFilter {
  /** Human-readable filter name/label. */
  name?: string;
  /** Filter query DSL. */
  dslQuery?: Record<string, unknown>;
  /** Whether the filter is enabled. */
  enabled?: boolean;
}

/** @public */
export interface UserActivityUserInputTimeRange {
  /** ISO timestamp of the start of the selected time range in the date picker. */
  start?: string;
  /** ISO timestamp of the end of the selected time range in the date picker. */
  end?: string;
}

/** @public */
export interface UserActivityUserInputMetadata {
  /** Which indices are affected by the user action. */
  indices?: string[];
  /** Time range selected by the user. */
  time?: UserActivityUserInputTimeRange;
  /** KQL/ES|QL query entered by the user in the global search field. */
  global_query?: string;
  /** Array of non-indexed objects describing filters configured by the user. */
  filters?: UserActivityUserInputFilter[];
}

/**
 * Additional bucket of non-standard metadata specific to the user activity log.
 * Includes standardized optional fields (e.g. `user_input`) for normalization.
 * @public
 */
export type UserActivityMetadata = Record<string, unknown> & {
  user_input?: UserActivityUserInputMetadata;
};

/** @public */
export interface TrackUserActionParams {
  /** Custom log message. If omitted, a default message is generated. */
  message?: string;
  /** Event attributes written to the log entry. */
  event: UserActivityEvent;
  /** Object attributes written to the log entry. */
  object: UserActivityObject;
  /** Additional bucket of non-standard metadata. */
  metadata?: UserActivityMetadata;
}

/**
 * Allows plugins to record user actions.
 * Contextual information (user, session, space, IP) is automatically injected.
 *
 * @example
 * ```ts
 * core.userActivity.trackUserAction({
 *   event: { action: 'edit_dashboard', type: 'change' },
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
