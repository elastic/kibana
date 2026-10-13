/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectionString as ConnectionStringType } from 'mongodb-connection-string-url';

// Dynamic import keeps mongodb-connection-string-url (and its whatwg-url/tr46 dependency
// chain) out of the browser bundle. This module is reachable from browser bundles (via
// `clientTypes` in this package's public entry point, and via specs/mongodb/mongodb.ts), so
// a top-level value import here would execute at module-eval time in the browser even though
// kbn-optimizer/kbn-rspack-optimizer mark the package as an external — externals only stop
// bundling, they don't stop the import from running.
export const loadConnectionString = async (): Promise<typeof ConnectionStringType> => {
  const { ConnectionString } = await import(
    /* webpackChunkName: "mongodbConnectionStringUrl" */ 'mongodb-connection-string-url'
  );
  return ConnectionString;
};
