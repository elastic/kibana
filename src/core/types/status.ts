/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CoreStatus as CoreStatusFromServer,
  ServiceStatus as ServiceStatusFromServer,
  ServiceStatusLevel as ServiceStatusLevelFromServer,
  OpsMetrics,
} from '../server';

/**
 * We need this type to convert the object `ServiceStatusLevel` to a union of the possible strings.
 * This is because of the "stringification" that occurs when serving HTTP requests.
 */
export type ServiceStatusLevel = ReturnType<ServiceStatusLevelFromServer['toString']>;

export interface ServiceStatus extends Omit<ServiceStatusFromServer, 'level'> {
  level: ServiceStatusLevel;
}

/**
 * Copy all the services listed in CoreStatus with their specific ServiceStatus declarations
 * but overwriting the `level` to its stringified version.
 */
export type CoreStatus = {
  [ServiceName in keyof CoreStatusFromServer]: ServiceStatus;
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
}

export interface StatusInfo {
  overall: ServiceStatus;
  core: CoreStatus;
  plugins: Record<string, ServiceStatus>;
}

export interface StatusResponse {
  name: string;
  uuid: string;
  version: ServerVersion;
  status: StatusInfo;
  metrics: ServerMetrics;
}
