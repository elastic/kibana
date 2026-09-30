/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_SAVED_OBJECT_ID_LENGTH,
  MAX_SAVED_OBJECT_NAME_LENGTH,
  MAX_SAVED_OBJECT_TYPE_LENGTH,
} from '@kbn/core-saved-objects-server';
import { SCHEMA_DISCOVER_SESSION_LATEST } from '@kbn/saved-search-plugin/server';

// Content Management accepts the same number of references when Discover saves a session.
const MAX_REFERENCES = 10_000;

export const storedDiscoverSessionParamsSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: MAX_SAVED_OBJECT_ID_LENGTH }),
});

/** A session in its stored format: saved object attributes and references. */
export const storedDiscoverSessionSchema = schema.object({
  attributes: SCHEMA_DISCOVER_SESSION_LATEST,
  references: schema.arrayOf(
    schema.object({
      name: schema.string({ maxLength: MAX_SAVED_OBJECT_NAME_LENGTH }),
      type: schema.string({ maxLength: MAX_SAVED_OBJECT_TYPE_LENGTH }),
      id: schema.string({ maxLength: MAX_SAVED_OBJECT_ID_LENGTH }),
    }),
    { maxSize: MAX_REFERENCES }
  ),
});

const optionalString = schema.maybe(schema.string());

export const storedDiscoverSessionResponseSchema = schema.object({
  id: schema.string(),
  data: storedDiscoverSessionSchema,
  // The fields returned by getMeta.
  meta: schema.object({
    created_at: optionalString,
    created_by: optionalString,
    managed: schema.boolean(),
    owner: optionalString,
    updated_at: optionalString,
    updated_by: optionalString,
    version: optionalString,
  }),
});
