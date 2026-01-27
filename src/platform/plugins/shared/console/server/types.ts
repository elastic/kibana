/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Duration } from 'moment';
import type { ConsoleServerPlugin } from './plugin';

export interface SpecDefinitionsJson {
  name: string;
  globals: Record<string, unknown>;
  endpoints: Record<string, unknown>;
}

/** @public */
export type ConsoleSetup = ReturnType<ConsoleServerPlugin['setup']> extends Promise<infer U>
  ? U
  : ReturnType<ConsoleServerPlugin['setup']>;

/** @public */
export interface ConsoleStart {
  getSpecJson: () => SpecDefinitionsJson;
}

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
