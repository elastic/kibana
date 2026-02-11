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
  /** Stack version where the action was introduced (for example: `9.5.0`). */
  versionAddedAt: string;
}

/**
 * Central registry of all known user-activity actions.
 * To add a new action, add an entry with a `description` and `ownerTeam`.
 * @private
 */
export const userActivityActions = {
  example_action: {
    description: `just an example so the first team using the service can use this as a guide, 
    we can remove this when we have an actual usage`,
    ownerTeam: '@elastic/kibana-core',
    groupName: 'Example plugins',
    versionAddedAt: '0.0',
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
