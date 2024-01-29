/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: delete this once ES client can be used for Connectors API

enum Result {
  created = 'created',
  updated = 'updated',
  deleted = 'deleted',
  not_found = 'not_found',
  no_op = 'noop',
}

export interface ConnectorsAPIUpdateResponse {
  result: Result;
}
