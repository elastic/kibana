/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import type { Http2SecureServer, Http2Server } from 'http2';
import type { Duration } from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';

/**
 * Composite type of all possible kind of Listener types.
 *
 * Unfortunately, there's no real common interface between all those concrete classes,
 * as `net.Server` and `tls.Server` don't list all the APIs we're using (such as event binding)
 */
export type ServerListener = Http2Server | Http2SecureServer | HttpServer | HttpsServer;

export type ServerProtocol = 'http1' | 'http2';

export interface IHttpConfig {
  protocol: ServerProtocol;
  host: string;
  port: number;
  maxPayload: ByteSizeValue;
  keepaliveTimeout: number;
  socketTimeout: number;
  payloadTimeout: number;
  cors: ICorsConfig;
  ssl: ISslConfig;
  shutdownTimeout: Duration;
  restrictInternalApis: boolean;
}

export interface ICorsConfig {
  enabled: boolean;
  allowCredentials: boolean;
  allowOrigin: string[];
}

export interface ISslConfig {
  enabled: boolean;
  key?: string;
  certificate?: string;
  certificateAuthorities?: string[];
  cipherSuites?: string[];
  keyPassphrase?: string;
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
  getSecureOptions?: () => number;
}
