/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isZod, z } from '@kbn/zod';
import { isConfigSchema } from '@kbn/config-schema';
import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectModelVersionForwardCompatibilitySchema,
} from '@kbn/core-saved-objects-server';
import { pickValuesBasedOnStructure } from '../utils';

export type ConvertedSchema = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;

function toAttributeObject(attributes: unknown): object {
  if (attributes !== null && typeof attributes === 'object') {
    return attributes;
  }
  return {};
}

export const convertModelVersionBackwardConversionSchema = (
  forwardSchema: SavedObjectModelVersionForwardCompatibilitySchema
): ConvertedSchema => {
  if (isZod(forwardSchema)) {
    const zodSchema = forwardSchema;
    return (doc) => {
      const originalAttrs = toAttributeObject(doc.attributes);
      const result = zodSchema.safeParse(doc.attributes);
      if (!result.success) {
        throw new Error(z.prettifyError(result.error));
      }
      const convertedAttrs = pickValuesBasedOnStructure(result.data, originalAttrs);
      return {
        ...doc,
        attributes: convertedAttrs,
      };
    };
  }

  if (isConfigSchema(forwardSchema)) {
    return (doc) => {
      const originalAttrs = toAttributeObject(doc.attributes);
      // Get the validated object, with possible stripping of unknown keys
      const validatedAttrs = forwardSchema.validate(doc.attributes);
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
  }

  if (typeof forwardSchema === 'function') {
    return (doc) => {
      const attrs = forwardSchema(doc.attributes);
      return {
        ...doc,
        attributes: attrs,
      };
    };
  }

  throw new Error(
    'Unknown forward compatibility schema. Must be defined with `@kbn/zod` or `@kbn/config-schema`.'
  );
};
