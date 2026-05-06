/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Prototype internal API path — keep in sync with route registration. */
export const MANAGEMENT_LANDING_ENVIRONMENT_HEALTH_API_PATH =
  '/internal/management/landing/environment_health' as const;

/**
 * Display label for Stack Management when Elasticsearch reports the default single-node name.
 * Keeps landing copy realistic without requiring a custom `cluster.name` in elasticsearch.yml.
 */
export const MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME =
  'elasticsearch-production-us-east-1';

export type AttentionReason = 'health_check_timed_out' | 'cluster_red' | 'cluster_yellow' | 'unassigned_shards';

/** Minimal DTO for a landing-page health strip (prototype; not privilege-granular). */
export interface EnvironmentHealthResponse {
  clusterName?: string;
  healthStatus?: 'green' | 'yellow' | 'red';
  indicesCount?: number;
  dataStreamsCount?: number;
  activeRulesCount?: number;
  /** Reasons the cluster needs attention. Empty array means everything is healthy. */
  attentionReasons: AttentionReason[];
}
