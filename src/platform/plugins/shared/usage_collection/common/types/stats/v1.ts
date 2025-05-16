/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as OpsMetricsCopy from './core_metrics';

/** v1 types Start */
/**
 * stats query v1
 * @remarks exclude_usage is always interpreted as true. query param retained to prevent breaking changes to existing consumers.
 */
export interface StatsHTTPQuery {
  extended?: boolean | '';
  legacy?: boolean | '';
  exclude_usage?: boolean | '';
}

export interface UsageObject {
  kibana?: UsageObject;
  xpack?: UsageObject;
  [key: string]: unknown | UsageObject;
}

export interface ClusterUuidLegacy {
  clusterUuid?: string;
}
export interface ClusterUuid {
  cluster_uuid?: string;
}
/**
 * Extended usage stats.
 * @remarks
 * Legacy implementation used to conditionally include kibana usage metrics
 * as of https://github.com/elastic/kibana/pull/151082, usage is no longer reported
 * and set to an empty object to prevent breaking changes to existing consumers.
 */
export interface ExtendedStats {
  [key: string]: unknown | UsageObject;
  clusterUuid?: string; // camel case if legacy === true
  cluster_uuid?: string; // snake_case if legacy === false
}
/**
 * OpsMetrics: aliased from a duplicate of core's OpsMetrics types
 * @remarks the alternative to creating a local copy of the OpsMetrics types is to declare them as `unknown` and assume validation happens elsewhere.
 * The disadvantage is that any changes made to the original OpsMetrics will be passed through without needing to update the API types.
 */
export type LastOpsMetrics = OpsMetricsCopy.OpsMetrics;

export type KibanaServiceStatus = Record<string, string>;
/** explicitly typed stats for kibana */
export interface KibanaStats {
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
}
/** Stats response body */
export type StatsHTTPBodyTyped = LastOpsMetrics | KibanaStats | ExtendedStats;
