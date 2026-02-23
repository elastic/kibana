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
  dashboard_created: {
    description:
      '[THIS IS AN EXAMPLE AND WILL BE REMOVED LATER] User created a dashboard in Kibana.',
    ownerTeam: '@elastic/kibana-core',
    groupName: 'Dashboards',
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
export const removedUserActivityActions = {
  rule_schedule_updated: {
    description:
      '[THIS IS AN EXAMPLE AND WILL BE REMOVED LATER] User updated an alerting rule schedule.',
    ownerTeam: '@elastic/kibana-core',
    groupName: 'Rules',
    versionAddedAt: '9.0',
    versionRemovedAt: '9.3',
  },
  dashboard_duplicated: {
    description: '[THIS IS AN EXAMPLE AND WILL BE REMOVED LATER] User duplicated a dashboard.',
    ownerTeam: '@elastic/kibana-core',
    groupName: 'Dashboards',
    versionAddedAt: '8.4',
    versionRemovedAt: '8.10',
  },
} as const satisfies Record<string, RemovedUserActivityActionDefinition>;
