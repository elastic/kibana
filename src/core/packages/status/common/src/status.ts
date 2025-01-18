/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildFlavor } from '@kbn/config';
import type { OpsMetrics } from '@kbn/core-metrics-server';
import type { ServiceStatusLevelId, ServiceStatus } from './service_status';
import type { CoreStatus } from './core_status';

export interface StatusInfoServiceStatus extends Omit<ServiceStatus, 'level'> {
  level: ServiceStatusLevelId;
}

/**
 * Copy all the services listed in CoreStatus with their specific ServiceStatus declarations
 * but overwriting the `level` to its stringified version.
 */
export type StatusInfoCoreStatus = {
  [ServiceName in keyof CoreStatus]: StatusInfoServiceStatus;
};

export type ServerMetrics = Omit<OpsMetrics, 'collected_at'> & {
  last_updated: string;
  collection_interval_in_millis: number;
  requests: {
    status_codes: Record<number, number>;
  };
};

export interface ServerVersion {
  number: string;
  build_hash: string;
  build_number: number;
  build_snapshot: boolean;
  build_flavor: BuildFlavor;
  build_date: string;
}

export interface StatusInfo {
  overall: StatusInfoServiceStatus;
  core: StatusInfoCoreStatus;
  plugins: Record<string, StatusInfoServiceStatus>;
}

export interface StatusResponse {
  name: string;
  uuid: string;
  version: ServerVersion;
  status: StatusInfo;
  metrics: ServerMetrics;
}
