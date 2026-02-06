/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const SCHEMA_SEARCH_SESSION_V8_8_O = schema.object({
  sessionId: schema.string(),
  name: schema.maybe(schema.string()),
  created: schema.string(),
  expires: schema.string(),
  appId: schema.maybe(schema.string()),
  locatorId: schema.maybe(schema.string()),
  initialState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  restoreState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  idMapping: schema.mapOf(
    schema.string(),
    schema.object({
      id: schema.string(),
      strategy: schema.string(),
    })
  ),
  realmType: schema.maybe(schema.string()),
  realmName: schema.maybe(schema.string()),
  username: schema.maybe(schema.string()),
  version: schema.string(),
  isCanceled: schema.maybe(schema.boolean()),
});

export const SCHEMA_SEARCH_SESSION_V1 = SCHEMA_SEARCH_SESSION_V8_8_O;
export const SCHEMA_SEARCH_SESSION_V2 = SCHEMA_SEARCH_SESSION_V1.extends({
  status: schema.maybe(schema.string()),
  idMapping: schema.mapOf(
    schema.string(),
    schema.object({
      id: schema.string(),
      strategy: schema.string(),
      status: schema.maybe(schema.string()),
      startedAt: schema.maybe(schema.string()),
      completedAt: schema.maybe(schema.string()),
      error: schema.maybe(
        schema.object({
          code: schema.string(),
          message: schema.maybe(schema.string()),
        })
      ),
    })
  ),
});
