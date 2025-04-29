/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isConfigSchema, type ObjectType } from '@kbn/config-schema';
import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectModelVersionForwardCompatibilitySchema,
} from '@kbn/core-saved-objects-server';
import { pickValuesBasedOnStructure } from '../utils';

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
      const originalAttrs = doc.attributes as object;
      // Get the validated object, with possible stripping of unknown keys
      const validatedAttrs = schema.validate(doc.attributes);
      // Use the validated attrs object to pick values from the original attrs.
      //
      // If we reversed this, validation conversion would be returned in the
      // converted attrs, for example: { duration: '1m' } => { duration: moment.Duration }
      // which this "conversion" wants to avoid.
      const convertedAttrs = pickValuesBasedOnStructure(validatedAttrs, originalAttrs);
      return {
        ...doc,
        attributes: convertedAttrs,
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
