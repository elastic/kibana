/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  MAX_SAVED_OBJECT_ID_LENGTH,
  MAX_SAVED_OBJECT_NAME_LENGTH,
  MAX_SAVED_OBJECT_TYPE_LENGTH,
  MAX_SAVED_OBJECT_VERSION_LENGTH,
} from '@kbn/core-saved-objects-server';
import { SCHEMA_DISCOVER_SESSION_LATEST } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionWarning } from './schema';

// Match the reference count accepted by the existing Content Management schema.
const MAX_REFERENCES = 10_000;

export const discoverSessionInternalDataSchema = schema.object({
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

export const discoverSessionInternalParamsSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: MAX_SAVED_OBJECT_ID_LENGTH }),
});

const optionalMetadataString = schema.maybe(schema.string());

export const discoverSessionInternalResponseSchema = schema.object({
  id: schema.string({ maxLength: MAX_SAVED_OBJECT_ID_LENGTH }),
  data: discoverSessionInternalDataSchema,
  // Match getMeta's projection while keeping response validation in config-schema.
  meta: schema.object({
    created_at: optionalMetadataString,
    created_by: optionalMetadataString,
    managed: schema.maybe(schema.boolean()),
    owner: optionalMetadataString,
    updated_at: optionalMetadataString,
    updated_by: optionalMetadataString,
    version: schema.maybe(schema.string({ maxLength: MAX_SAVED_OBJECT_VERSION_LENGTH })),
  }),
});

export type DiscoverSessionInternalData = TypeOf<typeof discoverSessionInternalDataSchema>;
export type DiscoverSessionInternalResponse = TypeOf<typeof discoverSessionInternalResponseSchema>;
export type DiscoverSessionInternalGetResponse = DiscoverSessionInternalResponse & {
  warnings?: DiscoverSessionWarning[];
};
