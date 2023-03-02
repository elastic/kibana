/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** v1 types Start */

/**
 * stats query v1
 */
export interface StatsHTTPQuery {
  extended?: boolean | '';
  legacy?: boolean | '';
  exclude_usage?: boolean | '';
}
/** unused, for demonstration only */
type MaybeRecord =
  | {
      [key: string]: Record<string, unknown>;
    }
  | unknown;

/** unused, for demonstration only */
interface StatsHTTPBodyPartiallyTyped {
  // lastMetrics
  elasticsearch_client: unknown;
  process: unknown;
  processes: unknown[];
  os: unknown;
  response_times: MaybeRecord;
  requests: MaybeRecord;
  concurrent_connections: number;
  // stats added
  lastUpdated: number;
  collectionInterval: number;
  // kibana
  kibana: {
    uuid: string;
    name: string;
    index: string;
    host: string;
    locale: string;
    transport_address: string;
    version: string;
    snapshot: boolean;
    status: string;
  };
  // others
  [key: string]: unknown;
}
/** unused, for demonstration only */
export type StatsHTTPBodyTyped = StatsHTTPBodyUntyped | StatsHTTPBodyPartiallyTyped;

/**
 * stats body v1
 * Used for telemetry purposes, not used to integrate with other Kibana clients.
 * Response body verification handled elsewhere
 */
type StatsHTTPBodyUntyped = unknown;

/**
 * generic type for api response body
 */
export interface StatsHTTPBody {
  [key: string]: unknown;
}
