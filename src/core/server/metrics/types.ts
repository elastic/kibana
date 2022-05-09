/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type { OpsProcessMetrics, OpsOsMetrics, OpsServerMetrics } from './collectors';

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
  /**
   * Process related metrics.
   * @deprecated use the processes field instead.
   * @removeBy 8.8.0
   */
  process: OpsProcessMetrics;
  /** Process related metrics. Reports an array of objects for each kibana pid.*/
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
 * an IntervalHistogram object that samples and reports the event loop delay over time.
 * The delays will be reported in milliseconds.
 *
 * @public
 */
export interface IntervalHistogram {
  // The first timestamp the interval timer kicked in for collecting data points.
  fromTimestamp: string;
  // Last timestamp the interval timer kicked in for collecting data points.
  lastUpdatedAt: string;
  // The minimum recorded event loop delay.
  min: number;
  // The maximum recorded event loop delay.
  max: number;
  // The mean of the recorded event loop delays.
  mean: number;
  // The number of times the event loop delay exceeded the maximum 1 hour event loop delay threshold.
  exceeds: number;
  // The standard deviation of the recorded event loop delays.
  stddev: number;
  // An object detailing the accumulated percentile distribution.
  percentiles: {
    // 50th percentile of delays of the collected data points.
    50: number;
    // 75th percentile of delays of the collected data points.
    75: number;
    // 95th percentile of delays of the collected data points.
    95: number;
    // 99th percentile of delays of the collected data points.
    99: number;
  };
}
