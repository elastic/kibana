/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
 * Complete tier for Observability solution.
 */
export const KIBANA_OBSERVABILITY_COMPLETE_TIER = 'complete' as const;
/**
 * Logs Essentials tier for Observability solution.
 */
export const KIBANA_OBSERVABILITY_LOGS_ESSENTIALS_TIER = 'logs_essentials' as const;
/**
 * Complete tier for Security solution.
 */
export const KIBANA_SECURITY_COMPLETE_TIER = 'complete' as const;
/**
 * Essentials tier for Security solution.
 */
export const KIBANA_SECURITY_ESSENTIALS_TIER = 'essentials' as const;
/**
 * Search AI Lake tier for Security solution.
 */
export const KIBANA_SECURITY_SEARCH_AI_LAKE_TIER = 'search_ai_lake' as const;

/**
 * Possible product tiers for Kibana solutions.
 */
export const KIBANA_PRODUCT_TIERS = {
  [KIBANA_OBSERVABILITY_SOLUTION]: [
    KIBANA_OBSERVABILITY_COMPLETE_TIER,
    KIBANA_OBSERVABILITY_LOGS_ESSENTIALS_TIER,
  ] as const,
  [KIBANA_SECURITY_SOLUTION]: [
    KIBANA_SECURITY_COMPLETE_TIER,
    KIBANA_SECURITY_ESSENTIALS_TIER,
    KIBANA_SECURITY_SEARCH_AI_LAKE_TIER,
  ] as const,
  [KIBANA_SEARCH_SOLUTION]: [] as const,
  [KIBANA_CHAT_SOLUTION]: [] as const,
} as const;

/**
 * Existing product tiers for all Kibana solutions.
 */
export type KibanaProductTier = (typeof KIBANA_PRODUCT_TIERS)[KibanaSolution][number];
