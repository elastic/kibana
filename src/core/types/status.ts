/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { OpsMetrics } from '../server/metrics';

export interface ServerStatus {
  id: string;
  title: string;
  state: string;
  message: string;
  uiColor: string;
  icon?: string;
  since?: string;
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
    statuses: ServerStatus[];
  };
  metrics: ServerMetrics;
}
