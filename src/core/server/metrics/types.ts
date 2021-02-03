/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { OpsProcessMetrics, OpsOsMetrics, OpsServerMetrics } from './collectors';

/**
 * APIs to retrieves metrics gathered and exposed by the core platform.
 *
 * @public
 */
export interface MetricsServiceSetup {
  /** Interval metrics are collected in milliseconds */
  readonly collectionInterval: number;

  /**
   * Retrieve an observable emitting the {@link OpsMetrics} gathered.
   * The observable will emit an initial value during core's `start` phase, and a new value every fixed interval of time,
   * based on the `opts.interval` configuration property.
   *
   * @example
   * ```ts
   * core.metrics.getOpsMetrics$().subscribe(metrics => {
   *   // do something with the metrics
   * })
   * ```
   */
  getOpsMetrics$: () => Observable<OpsMetrics>;
}
/**
 * {@inheritdoc MetricsServiceSetup}
 *
 * @public
 */
export type MetricsServiceStart = MetricsServiceSetup;

export type InternalMetricsServiceSetup = MetricsServiceSetup;
export type InternalMetricsServiceStart = MetricsServiceStart;

/**
 * Regroups metrics gathered by all the collectors.
 * This contains metrics about the os/runtime, the kibana process and the http server.
 *
 * @public
 */
export interface OpsMetrics {
  /** Time metrics were recorded at. */
  collected_at: Date;
  /** Process related metrics */
  process: OpsProcessMetrics;
  /** OS related metrics */
  os: OpsOsMetrics;
  /** server response time stats */
  response_times: OpsServerMetrics['response_times'];
  /** server requests stats */
  requests: OpsServerMetrics['requests'];
  /** number of current concurrent connections to the server */
  concurrent_connections: OpsServerMetrics['concurrent_connections'];
}
