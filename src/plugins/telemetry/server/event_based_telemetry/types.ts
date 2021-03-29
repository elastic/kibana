/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Duration } from 'moment';
import type { ByteSizeValue } from '@kbn/config-schema';
import type { TelemetryRootSchema } from '../../common/schema';

/**
 * Configuration of the LeakyBucket.
 * It sets the params to optimize the use of the network by producing
 * a "constant" flow of data vs. generating upload bursts that may use up
 * all the bandwidth temporarily.
 * @remark The maximum "constant" flow is calculated as {threshold}/{max_frequency_of_requests} bytes per second.
 */
export interface LeakyBucketConfig {
  /**
   * Min bytes to trigger a request
   */
  threshold: ByteSizeValue;
  /**
   * Time to wait between successful requests
   */
  max_frequency_of_requests: Duration;
  /**
   * Interval to attempt a request
   */
  interval: Duration;
  /**
   * Max interval without sending a request
   */
  max_wait_time: Duration;
  /**
   * Maximum retries before giving up and clearing the queue.
   */
  max_retries: number;
}

export interface EventBasedTelemetryServiceConfig {
  /**
   * Is Kibana running in dev mode
   */
  isDev: boolean;
  /**
   * The Kibana version as provided by core
   */
  kibanaVersion: string;
  /**
   * Getter to check if the cluster is opted-in for telemetry
   */
  getIsOptedIn: () => Promise<boolean>;
  /**
   * The URL to the Remote Telemetry Service
   */
  telemetryUrl: URL;
  /**
   * The total allowance in bytes for each plugin
   */
  plugin_size_quota_in_bytes: ByteSizeValue;
  /**
   * How often should it refresh the cache of the cluster_uuid and license_id
   */
  refresh_cluster_ids_interval: Duration;
  /**
   * {@link LeakyBucketConfig}
   */
  leaky_bucket: LeakyBucketConfig;
}

export interface EventChannelOptions {
  /**
   * The name of the channel
   */
  name: string;
  /**
   * Description of the payload to be sent in the channel
   */
  schema: TelemetryRootSchema;
  /**
   * Split of the plugin's total allowance that will be assigned to this channel
   */
  quotaPercentage?: number;
}

export interface EventWithTimestamp {
  timestamp: string;
  [channelName: string]: unknown;
}

export interface EventEnvelope extends EventWithTimestamp {
  cluster_uuid: string;
  cluster_name: string;
  version: string;
  licenseId?: string;
  plugin_name: string;
  channel_name: string;
}

export type HTTPSender = (events: string[]) => Promise<void>;
