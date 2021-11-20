/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { MaybePromise } from '@kbn/utility-types';
import type { IntervalHistogram } from '../types';

/** Base interface for all metrics gatherers */
export interface MetricsCollector<T> {
  /** collect the data currently gathered by the collector */
  collect(): MaybePromise<T>;
  /** reset the internal state of the collector */
  reset(): void;
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
