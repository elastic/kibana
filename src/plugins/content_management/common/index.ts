/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { PLUGIN_ID, API_ENDPOINT } from './constants';

export type {
  ProcedureSchemas,
  ProcedureName,
  GetIn,
  GetResult,
  BulkGetIn,
  BulkGetResult,
  CreateIn,
  CreateResult,
  UpdateIn,
  UpdateResult,
  DeleteIn,
  DeleteResult,
  SearchIn,
  SearchQuery,
  SearchResult,
  MSearchIn,
  MSearchQuery,
  MSearchResult,
  MSearchOut,
} from './rpc';
