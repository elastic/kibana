/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
