/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, Type } from '@kbn/config-schema';
import { SavedObjectsValidationSpec } from './types';
import { SavedObjectSanitizedDoc } from '../serialization';

// We convert `SavedObjectSanitizedDoc` to its validation schema representation
// to ensure that we don't forget to keep the schema up-to-date. TS will complain
// if we update `SavedObjectSanitizedDoc` without making changes below.
type SavedObjectSanitizedDocSchema = {
  [K in keyof Required<SavedObjectSanitizedDoc>]: Type<SavedObjectSanitizedDoc[K]>;
};

/**
 * Takes a {@link SavedObjectsValidationSpec} and returns a full schema representing
 * a {@link SavedObjectSanitizedDoc}, with the spec applied to the object's `attributes`.
 *
 * @internal
 */
export const createSavedObjectSanitizedDocSchema = (attributesSchema: SavedObjectsValidationSpec) =>
  schema.object<SavedObjectSanitizedDocSchema>({
    attributes: attributesSchema,
    id: schema.string(),
    type: schema.string(),
    references: schema.arrayOf(
      schema.object({
        name: schema.string(),
        type: schema.string(),
        id: schema.string(),
      }),
      { defaultValue: [] }
    ),
    namespace: schema.maybe(schema.string()),
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    coreMigrationVersion: schema.maybe(schema.string()),
    updated_at: schema.maybe(schema.string()),
    version: schema.maybe(schema.string()),
    originId: schema.maybe(schema.string()),
  });
