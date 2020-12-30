/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
