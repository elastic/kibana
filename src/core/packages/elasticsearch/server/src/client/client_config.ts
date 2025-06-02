/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Duration } from 'moment';
import type { ByteSizeValue } from '@kbn/config-schema';

/**
 * Definition of an API that should redact the requested body in the logs
 */
export interface ElasticsearchApiToRedactInLogs {
  /**
   * The ES path.
   * - If specified as a string, it'll be checked as `contains`.
   * - If specified as a RegExp, it'll be tested against the path.
   */
  path: string | RegExp;
  /**
   * HTTP method.
   * If not provided, the path will be checked for all methods.
   */
  method?: string;
}

/**
 * Configuration options to be used to create a {@link IClusterClient | cluster client}
 *
 * @public
 */
export interface ElasticsearchClientConfig {
  /** {@inheritDoc IElasticsearchConfig.customHeaders} */
  customHeaders: Record<string, string>;
  /** {@inheritDoc IElasticsearchConfig.requestHeadersWhitelist} */
  requestHeadersWhitelist: string[];
  /** {@inheritDoc IElasticsearchConfig.maxSockets} */
  maxSockets: number;
  /** {@inheritDoc IElasticsearchConfig.maxIdleSockets} */
  maxIdleSockets: number;
  /** {@inheritDoc IElasticsearchConfig.maxResponseSize} */
  maxResponseSize?: ByteSizeValue;
  /** {@inheritDoc IElasticsearchConfig.idleSocketTimeout} */
  idleSocketTimeout: Duration;
  /** {@inheritDoc IElasticsearchConfig.compression} */
  compression: boolean;
  /** {@inheritDoc IElasticsearchConfig.sniffOnStart} */
  sniffOnStart: boolean;
  /** {@inheritDoc IElasticsearchConfig.sniffOnConnectionFault} */
  sniffOnConnectionFault: boolean;
  /** {@inheritDoc IElasticsearchConfig.sniffInterval} */
  sniffInterval: false | Duration;
  /** {@inheritDoc IElasticsearchConfig.username} */
  username?: string;
  /** {@inheritDoc IElasticsearchConfig.password} */
  password?: string;
  /** {@inheritDoc IElasticsearchConfig.serviceAccountToken} */
  serviceAccountToken?: string;
  /** {@inheritDoc IElasticsearchConfig.hosts} */
  hosts: string[];
  /** {@inheritDoc IElasticsearchConfig.keepAlive} */
  keepAlive?: boolean;
  /** {@inheritDoc IElasticsearchConfig.pingTimeout} */
  pingTimeout?: Duration | number;
  /** {@inheritDoc IElasticsearchConfig.requestTimeout} */
  requestTimeout?: Duration | number;
  /** {@inheritDoc IElasticsearchConfig.caFingerprint} */
  caFingerprint?: string;
  /** {@inheritDoc IElasticsearchConfig.ssl} */
  ssl?: ElasticsearchClientSslConfig;
  /** {@inheritDoc IElasticsearchConfig.apisToRedactInLogs} */
  apisToRedactInLogs?: ElasticsearchApiToRedactInLogs[];
  /** {@inheritDoc IElasticsearchConfig.dnsCacheTtl} */
  dnsCacheTtl: Duration;
  /** {@inheritDoc IElasticsearchConfig.serverMode} */
  serverMode?: 'stack' | 'serverless';
}

/**
 * @public
 */
export interface ElasticsearchClientSslConfig {
  verificationMode?: 'none' | 'certificate' | 'full';
  certificate?: string;
  certificateAuthorities?: string[];
  key?: string;
  keyPassphrase?: string;
  alwaysPresentCertificate?: boolean;
}
