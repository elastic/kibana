/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import type { Duration } from 'moment';

export interface IHttpConfig {
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
