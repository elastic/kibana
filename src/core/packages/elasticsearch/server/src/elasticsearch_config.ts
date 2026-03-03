/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Duration } from 'moment';
import type { ElasticsearchApiToRedactInLogs } from './client';

/**
 * @public
 */
export interface IElasticsearchConfig {
  /**
   * The interval between health check requests Kibana sends to the Elasticsearch before the first green signal.
   */
  readonly healthCheckStartupDelay: Duration;
  /**
   * The interval between health check requests Kibana sends to the Elasticsearch after the first green signal.
   */
  readonly healthCheckDelay: Duration;

  /**
   * The interval between health check requests Kibana sends to the Elasticsearch during failure.
   */
  readonly healthCheckFailureInterval: Duration | undefined;

  /**
   * The number of times to retry the health check request
   */
  readonly healthCheckRetry: number;

  /**
   * Whether to allow kibana to connect to a non-compatible elasticsearch node.
   */
  readonly ignoreVersionMismatch: boolean;

  /**
   * Version of the Elasticsearch (6.7, 7.1 or `master`) client will be connecting to.
   */
  readonly apiVersion: string;

  /**
   * The maximum number of sockets that can be used for communications with elasticsearch.
   */
  readonly maxSockets: number;

  /**
   * The maximum number of idle sockets to keep open between Kibana and Elasticsearch. If more sockets become idle, they will be closed.
   */
  readonly maxIdleSockets: number;

  /**
   * The timeout for idle sockets kept open between Kibana and Elasticsearch. If the socket is idle for longer than this timeout, it will be closed.
   */
  readonly idleSocketTimeout: Duration;

  /**
   * Whether to use compression for communications with elasticsearch.
   */
  readonly compression: boolean;

  /**
   * Hosts that the client will connect to. If sniffing is enabled, this list will
   * be used as seeds to discover the rest of your cluster.
   */
  readonly hosts: string[];

  /**
   * List of Kibana client-side headers to send to Elasticsearch when request
   * scoped cluster client is used. If this is an empty array then *no* client-side
   * will be sent.
   */
  readonly requestHeadersWhitelist: string[];

  /**
   * Timeout after which HTTP request will be aborted and retried.
   */
  readonly requestTimeout: Duration;

  /**
   * Timeout for Elasticsearch to wait for responses from shards. Set to 0 to disable.
   */
  readonly shardTimeout: Duration;

  /**
   * Specifies whether the client should attempt to detect the rest of the cluster
   * when it is first instantiated.
   */
  readonly sniffOnStart: boolean;

  /**
   * Interval to perform a sniff operation and make sure the list of nodes is complete.
   * If `false` then sniffing is disabled.
   */
  readonly sniffInterval: false | Duration;

  /**
   * Specifies whether the client should immediately sniff for a more current list
   * of nodes when a connection dies.
   */
  readonly sniffOnConnectionFault: boolean;

  /**
   * If Elasticsearch is protected with basic authentication, this setting provides
   * the username that the Kibana server uses to perform its administrative functions.
   * Cannot be used in conjunction with serviceAccountToken.
   */
  readonly username?: string;

  /**
   * If Elasticsearch is protected with basic authentication, this setting provides
   * the password that the Kibana server uses to perform its administrative functions.
   */
  readonly password?: string;

  /**
   * If Elasticsearch security features are enabled, this setting provides the service account
   * token that the Kibana server users to perform its administrative functions.
   *
   * This is an alternative to specifying a username and password.
   */
  readonly serviceAccountToken?: string;

  /**
   * Header names and values to send to Elasticsearch with every request. These
   * headers cannot be overwritten by client-side headers and aren't affected by
   * `requestHeadersWhitelist` configuration.
   */
  readonly customHeaders: Record<string, string>;

  /**
   * @internal
   * Only valid in dev mode. Skip the valid connection check during startup. The connection check allows
   * Kibana to ensure that the Elasticsearch connection is valid before allowing
   * any other services to be set up.
   *
   * @remarks
   * You should disable this check at your own risk: Other services in Kibana
   * may fail if this step is not completed.
   */
  readonly skipStartupConnectionCheck: boolean;

  /**
   * Set of settings configure SSL connection between Kibana and Elasticsearch that
   * are required when `xpack.ssl.verification_mode` in Elasticsearch is set to
   * either `certificate` or `full`.
   */
  readonly ssl: ElasticsearchSslConfig;

  /**
   * Extends the list of APIs that should be redacted in logs.
   */
  readonly apisToRedactInLogs: ElasticsearchApiToRedactInLogs[];

  /**
   * The maximum time to retain the DNS lookup resolutions.
   * Set to 0 to disable the cache (default Node.js behavior)
   */
  readonly dnsCacheTtl: Duration;
}

/**
 * @public
 */
export interface ElasticsearchSslConfig {
  verificationMode: 'none' | 'certificate' | 'full';
  certificate?: string;
  certificateAuthorities?: string[];
  key?: string;
  keyPassphrase?: string;
  alwaysPresentCertificate: boolean;
}
