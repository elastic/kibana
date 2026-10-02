/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  hasLegacyData: boolean;
}

// When profiling is disabled in Elasticsearch, neither schema can be used, so no schema status is reported.
export interface DisabledProfilingStatus {
  isEnabled: false;
}

export interface EnabledProfilingSchemasStatus {
  isEnabled: true;
  otel: OtelProfilingSchemaStatus;
  universalProfiling: UniversalProfilingSchemaStatus;
}

export type ProfilingSchemasStatus = DisabledProfilingStatus | EnabledProfilingSchemasStatus;

export interface EnabledProfilingStatus extends EnabledProfilingSchemasStatus {
  universalProfiling: UniversalProfilingSchemaStatus & { canSetup?: boolean };
}

export type ProfilingStatus = DisabledProfilingStatus | EnabledProfilingStatus;
