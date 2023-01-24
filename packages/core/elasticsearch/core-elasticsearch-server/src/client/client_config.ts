/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Duration } from 'moment';

/**
 * Configuration options to be used to create a {@link IClusterClient | cluster client}
 *
 * @public
 */
export interface ElasticsearchClientConfig {
  customHeaders: Record<string, string>;
  requestHeadersWhitelist: string[];
  maxSockets: number;
  maxIdleSockets: number;
  idleSocketTimeout: Duration;
  compression: boolean;
  sniffOnStart: boolean;
  sniffOnConnectionFault: boolean;
  sniffInterval: false | Duration;
  username?: string;
  password?: string;
  serviceAccountToken?: string;
  hosts: string[];
  keepAlive?: boolean;
  pingTimeout?: Duration | number;
  requestTimeout?: Duration | number;
  caFingerprint?: string;
  ssl?: ElasticsearchClientSslConfig;
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
