/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpsMetrics } from '../server/metrics';

export type ServerStatusLevel = 'available' | 'degraded' | 'unavailable' | 'critical';

export interface ServerStatus {
  level: ServerStatusLevel;
  summary: string;
  meta?: Record<string, unknown>;
}

export type ServerMetrics = OpsMetrics & {
  collection_interval_in_millis: number;
};

export interface ServerVersion {
  number: string;
  build_hash: string;
  build_number: string;
  build_snapshot: string;
}

export interface StatusResponse {
  name: string;
  uuid: string;
  version: ServerVersion;
  status: {
    overall: ServerStatus;
    core: Record<string, ServerStatus>;
    plugins: Record<string, ServerStatus>;
  };
  metrics: ServerMetrics;
}
