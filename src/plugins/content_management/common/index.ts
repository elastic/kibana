/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { PLUGIN_ID, API_ENDPOINT } from './constants';
export type { ProcedureSchemas, ProcedureName, GetIn, CreateIn } from './rpc';
export { procedureNames, schemas as rpcSchemas } from './rpc';
