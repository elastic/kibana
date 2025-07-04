/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The base group, for all modules that are commonly used across solutions.
 */
export const KIBANA_PLATFORM = 'platform' as const;
/**
 * Constant for the Kibana Observability solution.
 */
export const KIBANA_OBSERVABILITY_SOLUTION = 'observability' as const;
/**
 * Constant for the Kibana Security solution.
 */
export const KIBANA_SECURITY_SOLUTION = 'security' as const;
/**
 * Constant for the Kibana Search solution.
 */
export const KIBANA_SEARCH_SOLUTION = 'search' as const;
/**
 * Constant for the Kibana Chat (workchat) solution.
 */
export const KIBANA_CHAT_SOLUTION = 'chat' as const;

/**
 * A list of all Kibana solutions.
 */
export const KIBANA_SOLUTIONS = [
  KIBANA_OBSERVABILITY_SOLUTION,
  KIBANA_SECURITY_SOLUTION,
  KIBANA_SEARCH_SOLUTION,
  KIBANA_CHAT_SOLUTION,
] as const; // BOOKMARK - List of Kibana solutions

/**
 * A type that defines the existing solutions.
 */
export type KibanaSolution = (typeof KIBANA_SOLUTIONS)[number];

/**
 * A list of all Kibana groups (platform + solutions).
 */
export const KIBANA_GROUPS = [KIBANA_PLATFORM, ...KIBANA_SOLUTIONS] as const;

/**
 * A type that defines the existing groups (platform + solutions).
 */
export type KibanaGroup = (typeof KIBANA_GROUPS)[number];

/**
 * The groups to which a module can belong.
 * 'common' is the default for uncategorised modules.
 */
export type ModuleGroup = KibanaGroup | 'common';

/**
 * ModuleVisibility tells whether a module is accessible from any module (shared) or only from modules of the same group (private)
 */
export type ModuleVisibility = 'private' | 'shared';

/**
 * Constant for the Kibana Observability (workchat) serverless project type.
 */
export const KIBANA_OBSERVABILITY_PROJECT = 'oblt' as const;
/**
 * Constant for the Kibana Security (workchat) serverless project type.
 */
export const KIBANA_SECURITY_PROJECT = 'security' as const;
/**
 * Constant for the Kibana Search (workchat) serverless project type.
 */
export const KIBANA_SEARCH_PROJECT = 'es' as const;
/**
 * Constant for the Kibana Chat (workchat) serverless project type.
 */
export const KIBANA_CHAT_PROJECT = 'chat' as const;

/**
 * A list of all Kibana serverless project types.
 */
export const KIBANA_PROJECTS = [
  KIBANA_OBSERVABILITY_PROJECT,
  KIBANA_SECURITY_PROJECT,
  KIBANA_SEARCH_PROJECT,
  KIBANA_CHAT_PROJECT,
] as const; // BOOKMARK - List of Kibana project types

/**
 * A type that defines the existing serverless project types.
 */
export type KibanaProject = (typeof KIBANA_PROJECTS)[number];
