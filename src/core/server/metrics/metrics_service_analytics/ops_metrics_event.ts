/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpsMetrics } from '../types';
import type { OpsProcessMetrics, OpsOsMetrics, OpsServerMetrics } from '../collectors';

/**
 * Converts OpsMetrics into OpsMetricsEvent, dropping the deprecated 'process' field
 * This contains metrics about the os/runtime, the kibana processes and the http server.
 * @internal
 */
export interface OpsMetricsEvent {
  /** Time metrics were recorded at. */
  collected_at: Date;
  /** Process related metrics. */
  processes: OpsProcessMetrics[];
  /** OS related metrics */
  os: OpsOsMetrics;
  /** server response time stats */
  response_times: OpsServerMetrics['response_times'];
  /** server requests stats */
  requests: OpsServerMetrics['requests'];
  /** number of current concurrent connections to the server */
  concurrent_connections: OpsServerMetrics['concurrent_connections'];
}
/**
 * Converts ops metrics into an ops metrics event
 * @param metrics: ops metrics
 * @returns {OpsMetricsEvent}
 * @internal
 */
export function convertToMetricEvent(metrics: OpsMetrics): OpsMetricsEvent {
  const { process, ...rest } = metrics;
  return rest;
}
