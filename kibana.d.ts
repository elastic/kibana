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

/**
 * All exports from TS source files (where the implementation is actually done in TS).
 */
import * as Public from 'src/core/public';
import * as Server from 'src/core/server';

export { Public, Server };

/**
 * All exports from TS ambient definitions (where types are added for JS source in a .d.ts file).
 */
import * as LegacyKibanaServer from './src/legacy/server/kbn_server';

/**
 *  Re-export legacy types under a namespace.
 */
export namespace Legacy {
  export type KibanaConfig = LegacyKibanaServer.KibanaConfig;
  export type Request = LegacyKibanaServer.Request;
  export type ResponseToolkit = LegacyKibanaServer.ResponseToolkit;
  export type Server = LegacyKibanaServer.Server;
}
