/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @public */
export interface UserActivityActionDefinition {
  // Description of the action
  description: string;
  // Team that owns this action, for example: @elastic/kibana-core
  ownerTeam: string;
  // Name to group the actions by, for example: dashboard, cases, ...
  groupName: string;
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
  },
} as const satisfies Record<string, UserActivityActionDefinition>;

/** Closed union derived from the keys of {@link userActivityActions}. @public */
export type UserActivityActionId = keyof typeof userActivityActions;
