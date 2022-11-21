/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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

/**
 * Protocol(s) used by the Elasticsearch Client
 * @public
 */

export type ElasticsearchClientProtocol = 'none' | 'http' | 'https' | 'mixed';

/**
 * Metrics related to the elasticsearch clients
 * @public
 */
export interface ElasticsearchClientsMetrics {
  /** Total number of active sockets (all nodes, all connections) */
  totalActiveSockets: number;
  /** Total number of available sockets (alive but idle, all nodes, all connections) */
  totalIdleSockets: number;
  /** Total number of queued requests (all nodes, all connections) */
  totalQueuedRequests: number;
}

/**
 * Process related metrics
 * @public
 */
export interface OpsProcessMetrics {
  /** pid of the kibana process */
  pid: number;
  /** process memory usage */
  memory: {
    /** heap memory usage */
    heap: {
      /** total heap available */
      total_in_bytes: number;
      /** used heap */
      used_in_bytes: number;
      /** v8 heap size limit */
      size_limit: number;
    };
    /** node rss */
    resident_set_size_in_bytes: number;
  };
  /** mean event loop delay since last collection*/
  event_loop_delay: number;
  /** node event loop delay histogram since last collection */
  event_loop_delay_histogram: IntervalHistogram;
  /** uptime of the kibana process */
  uptime_in_millis: number;
}

/**
 * OS related metrics
 * @public
 */
export interface OpsOsMetrics {
  /** The os platform */
  platform: NodeJS.Platform;
  /** The os platform release, prefixed by the platform name */
  platformRelease: string;
  /** The os distrib. Only present for linux platforms */
  distro?: string;
  /** The os distrib release, prefixed by the os distrib. Only present for linux platforms */
  distroRelease?: string;
  /** cpu load metrics */
  load: {
    /** load for last minute */
    '1m': number;
    /** load for last 5 minutes */
    '5m': number;
    /** load for last 15 minutes */
    '15m': number;
  };
  /** system memory usage metrics */
  memory: {
    /** total memory available */
    total_in_bytes: number;
    /** current free memory */
    free_in_bytes: number;
    /** current used memory */
    used_in_bytes: number;
  };
  /** the OS uptime */
  uptime_in_millis: number;

  /** cpu accounting metrics, undefined when not running in a cgroup */
  cpuacct?: {
    /** name of this process's cgroup */
    control_group: string;
    /** cpu time used by this process's cgroup */
    usage_nanos: number;
  };

  /** cpu cgroup metrics, undefined when not running in a cgroup */
  cpu?: {
    /** name of this process's cgroup */
    control_group: string;
    /** the length of the cfs period */
    cfs_period_micros: number;
    /** total available run-time within a cfs period */
    cfs_quota_micros: number;
    /** current stats on the cfs periods */
    stat: {
      /** number of cfs periods that elapsed */
      number_of_elapsed_periods: number;
      /** number of times the cgroup has been throttled */
      number_of_times_throttled: number;
      /** total amount of time the cgroup has been throttled for */
      time_throttled_nanos: number;
    };
  };
}

/**
 * server related metrics
 * @public
 */
export interface OpsServerMetrics {
  /** server response time stats */
  response_times: {
    /** average response time */
    avg_in_millis: number;
    /** maximum response time */
    max_in_millis: number;
  };
  /** server requests stats */
  requests: {
    /** number of disconnected requests since startup */
    disconnects: number;
    /** total number of requests handled since startup */
    total: number;
    /** number of request handled per response status code */
    statusCodes: Record<number, number>;
  };
  /** number of current concurrent connections to the server */
  concurrent_connections: number;
}

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
   * Metrics related to the elasticsearch client
   */
  elasticsearch_client: ElasticsearchClientsMetrics;
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
