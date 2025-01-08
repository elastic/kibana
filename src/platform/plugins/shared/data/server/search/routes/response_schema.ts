/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const searchSessionRequestInfoSchema = schema.object({
  id: schema.string(),
  strategy: schema.string(),
});

const serializeableSchema = schema.mapOf(schema.string(), schema.any());

const searchSessionAttrSchema = () =>
  schema.object({
    sessionId: schema.string(),
    name: schema.maybe(schema.string()),
    appId: schema.maybe(schema.string()),
    created: schema.string(),
    expires: schema.string(),
    locatorId: schema.maybe(schema.string()),
    initialState: schema.maybe(serializeableSchema),
    restoreState: schema.maybe(serializeableSchema),
    idMapping: schema.mapOf(schema.string(), searchSessionRequestInfoSchema),
    realmType: schema.maybe(schema.string()),
    realmName: schema.maybe(schema.string()),
    username: schema.maybe(schema.string()),
    version: schema.string(),
    isCanceled: schema.maybe(schema.boolean()),
  });

export const searchSessionSchema = () =>
  schema.object({
    id: schema.string(),
    attributes: searchSessionAttrSchema(),
  });

export const searchSessionStatusSchema = () =>
  schema.object({
    status: schema.oneOf([
      schema.literal('in_progress'),
      schema.literal('error'),
      schema.literal('complete'),
      schema.literal('cancelled'),
      schema.literal('expired'),
    ]),
    errors: schema.maybe(schema.arrayOf(schema.string())),
  });

export const searchSessionsFindSchema = () =>
  schema.object({
    total: schema.number(),
    saved_objects: schema.arrayOf(searchSessionSchema()),
    statuses: schema.recordOf(schema.string(), searchSessionStatusSchema()),
  });

const referencesSchema = schema.arrayOf(
  schema.object({ id: schema.string(), type: schema.string(), name: schema.string() })
);

export const searchSessionsUpdateSchema = () =>
  schema.object({
    id: schema.string(),
    type: schema.string(),
    updated_at: schema.maybe(schema.string()),
    version: schema.maybe(schema.string()),
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    references: schema.maybe(referencesSchema),
    attributes: schema.object({
      name: schema.maybe(schema.string()),
      expires: schema.maybe(schema.string()),
    }),
  });
