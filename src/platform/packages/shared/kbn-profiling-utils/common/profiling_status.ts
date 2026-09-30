/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Universal Profiling status, as reported by `GET /api/profiling/setup/es_resources`. */
export interface UniversalProfilingStatus {
  profiling_enabled: boolean;
  has_setup: boolean;
  has_data: boolean;
  pre_8_9_1_data: boolean;
}

export interface OtelProfilingSchemaStatus {
  isAvailable: boolean;
  hasData: boolean;
}

export interface UniversalProfilingSchemaStatus {
  isAvailable: boolean;
  hasSetup: boolean;
  hasData: boolean;
  /** Whether data ingested before 8.9.1 is present, which the current version cannot read. */
  hasLegacyData: boolean;
}

/** Profiling status across the OTel and Universal Profiling schemas. */
export interface ProfilingSchemasStatus {
  isEnabled: boolean;
  otel: OtelProfilingSchemaStatus;
  universalProfiling: UniversalProfilingSchemaStatus;
}

/** Profiling status including whether the current user can run the Universal Profiling setup. */
export interface ProfilingStatus extends ProfilingSchemasStatus {
  universalProfiling: UniversalProfilingSchemaStatus & { canSetup: boolean };
}
