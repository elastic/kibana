/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// exporting schemas separately from the index.ts file to not include @kbn/schema in the public bundle
// should be only used server-side or in jest tests
export { schemas as rpcSchemas } from './rpc';
