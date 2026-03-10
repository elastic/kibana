/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Definition for a user-activity action.
 * @public
 */
export interface UserActivityActionDefinition {
  /** Human-readable description of the action. */
  description: string;
  /** Team that owns this action, for example: `@elastic/kibana-core`. */
  ownerTeam: string;
  /** Group name used to organize actions in UIs/docs (for example: `dashboard`, `cases`). */
  groupName: string;
  /** Stack version where the action was introduced (for example: `9.5`). */
  versionAddedAt: string;
}

/**
 * Central registry of all known user-activity actions.
 * To add a new action, add an entry with a `description`, `ownerTeam`, `groupName` and `versionAddedAt`.
 * @private
 */
export const userActivityActions = {
  user_logged_in: {
    description: 'User logged in to Kibana.',
    ownerTeam: '@elastic/kibana-core',
    groupName: 'Authentication',
    versionAddedAt: '9.4',
  },
} as const satisfies Record<string, UserActivityActionDefinition>;

/** Closed union derived from the keys of {@link userActivityActions}. @public */
export type UserActivityActionId = keyof typeof userActivityActions;

/**
 * Definition for a user-activity action that has been removed.
 * Just adding the version when it was removed for documentation purposes.
 * @private
 */
export interface RemovedUserActivityActionDefinition extends UserActivityActionDefinition {
  /** Stack version where the action was removed (for example: `9.6`). */
  versionRemovedAt: string;
}

/**
 * Registry for actions that have been removed.
 * @private
 */
export const removedUserActivityActions = {} as const satisfies Record<
  string,
  RemovedUserActivityActionDefinition
>;
