/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const baseMetaSchema = schema.object({
  managed: schema.maybe(schema.boolean()),
  error: schema.maybe(
    schema.object({
      error: schema.string(),
      message: schema.string(),
      statusCode: schema.number(),
      metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    })
  ),
  version: schema.maybe(schema.string()),
});

export const createdMetaSchema = schema.object({
  created_at: schema.maybe(schema.string()),
  created_by: schema.maybe(schema.string()),
});

export const updatedMetaSchema = schema.object({
  updated_at: schema.maybe(schema.string()),
  updated_by: schema.maybe(schema.string()),
});

export const resolveMetaSchema = schema.object({
  outcome: schema.oneOf([
    schema.literal('exactMatch'),
    schema.literal('aliasMatch'),
    schema.literal('conflict'),
  ]),
  alias_target_id: schema.maybe(schema.string()),
  alias_purpose: schema.maybe(
    schema.oneOf([schema.literal('savedObjectConversion'), schema.literal('savedObjectImport')])
  ),
});
