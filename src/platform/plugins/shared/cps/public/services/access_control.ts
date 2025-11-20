/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProjectRoutingAccess } from '@kbn/cps-utils';

/**
 * Rule for determining access based on route pattern
 */
export interface RouteAccessRule {
  /** Regex pattern to match against location hash */
  pattern: RegExp;
  /** Access level to grant when pattern matches */
  access: ProjectRoutingAccess;
}

/**
 * Configuration for a single app's access control
 */
export interface AppAccessConfig {
  /** Default access level for this app (when no route rules match) */
  defaultAccess: ProjectRoutingAccess;
  /** Optional route-specific rules (checked in order) */
  routeRules?: RouteAccessRule[];
  /** Optional custom readonly message for this app */
  readonlyMessage?: string;
}

/**
 * Complete access control configuration
 * Maps app IDs to their access configurations
 */
export type AccessControlConfig = Record<string, AppAccessConfig>;

/**
 * Default access control configuration
 *
 * Access Levels:
 * - EDITABLE: Full functionality - users can change project scope
 * - READONLY: View-only mode - shows current scope but prevents changes
 * - DISABLED: Picker is completely disabled
 *
 * Default Configuration:
 *
 * | App        | Route                  | Access Level | Notes                              |
 * |------------|------------------------|--------------|-------------------------------------|
 * | dashboards | all routes except list | EDITABLE     | All dashboard pages except listing  |
 * | dashboards | #/list                 | DISABLED     | List page only                     |
 * | discover   | all routes             | EDITABLE     | All discover pages                 |
 * | visualize  | type:vega in route     | EDITABLE     | Vega visualizations only           |
 * | visualize  | other routes           | DISABLED     | Other visualization types          |
 * | lens       | all routes             | READONLY     | All lens pages (read-only)         |
 * | all others | all routes             | DISABLED     | Default behavior for unknown apps  |
 */
export const DEFAULT_ACCESS_CONTROL_CONFIG: AccessControlConfig = {
  dashboards: {
    defaultAccess: ProjectRoutingAccess.EDITABLE,
    routeRules: [
      {
        pattern: /#\/list/,
        access: ProjectRoutingAccess.DISABLED,
      },
    ],
  },
  discover: {
    defaultAccess: ProjectRoutingAccess.EDITABLE,
  },
  visualize: {
    defaultAccess: ProjectRoutingAccess.DISABLED,
    routeRules: [
      {
        pattern: /type:vega/, // Restrict to only Vega visualizations
        access: ProjectRoutingAccess.EDITABLE,
      },
    ],
  },
  lens: {
    defaultAccess: ProjectRoutingAccess.READONLY,
    readonlyMessage: 'Please adjust project scope for each layer in the Lens editor.',
  },
};

/**
 * Determines project routing access level based on app and route
 */
export const getProjectRoutingAccess = (
  currentAppId: string,
  hash: string,
  config: AccessControlConfig = DEFAULT_ACCESS_CONTROL_CONFIG
): ProjectRoutingAccess => {
  const appConfig = config[currentAppId];
  if (!appConfig) {
    return ProjectRoutingAccess.DISABLED;
  }

  if (appConfig.routeRules) {
    for (const rule of appConfig.routeRules) {
      if (rule.pattern.test(hash)) {
        return rule.access;
      }
    }
  }
  return appConfig.defaultAccess;
};

export const getReadonlyMessage = (
  currentAppId?: string,
  config: AccessControlConfig = DEFAULT_ACCESS_CONTROL_CONFIG
): string | undefined => {
  return currentAppId ? config[currentAppId]?.readonlyMessage : undefined;
};
