/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
