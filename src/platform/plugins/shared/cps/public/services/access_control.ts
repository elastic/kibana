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
 */
export const ACCESS_CONTROL_CONFIG: AccessControlConfig = {
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
    defaultAccess: ProjectRoutingAccess.EDITABLE,
  },
  maps: {
    defaultAccess: ProjectRoutingAccess.EDITABLE,
  },
};

/**
 * Determines project routing access level based on app and route
 */
export const getProjectRoutingAccess = (
  currentAppId: string,
  hash: string
): ProjectRoutingAccess => {
  const appConfig = ACCESS_CONTROL_CONFIG[currentAppId];
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
