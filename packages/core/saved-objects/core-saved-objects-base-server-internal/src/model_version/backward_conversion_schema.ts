/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isConfigSchema, type ObjectType } from '@kbn/config-schema';
import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectModelVersionForwardCompatibilitySchema,
} from '@kbn/core-saved-objects-server';

function isObjectType(
  schema: SavedObjectModelVersionForwardCompatibilitySchema
): schema is ObjectType {
  return isConfigSchema(schema);
}

export type ConvertedSchema = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;

export const convertModelVersionBackwardConversionSchema = (
  schema: SavedObjectModelVersionForwardCompatibilitySchema
): ConvertedSchema => {
  if (isObjectType(schema)) {
    return (doc) => {
      const attrs = schema.validate(doc.attributes, {});
      return {
        ...doc,
        attributes: attrs,
      };
    };
  } else {
    return (doc) => {
      const attrs = schema(doc.attributes);
      return {
        ...doc,
        attributes: attrs,
      };
    };
  }
};
