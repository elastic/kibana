/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Duration } from 'moment';
import { ConsoleServerPlugin } from './plugin';

/** @public */
export type ConsoleSetup = ReturnType<ConsoleServerPlugin['setup']> extends Promise<infer U>
  ? U
  : ReturnType<ConsoleServerPlugin['setup']>;

/** @public */
export type ConsoleStart = ReturnType<ConsoleServerPlugin['start']> extends Promise<infer U>
  ? U
  : ReturnType<ConsoleServerPlugin['start']>;

/** @internal */
export interface ESConfigForProxy {
  hosts: string[];
  requestHeadersWhitelist: string[];
  customHeaders: Record<string, any>;
  requestTimeout: Duration;
  ssl?: {
    verificationMode: 'none' | 'certificate' | 'full';
    alwaysPresentCertificate: boolean;
    certificateAuthorities?: string[];
    certificate?: string;
    key?: string;
    keyPassphrase?: string;
  };
}
