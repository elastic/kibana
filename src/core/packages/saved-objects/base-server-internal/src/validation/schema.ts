/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, isZod } from '@kbn/zod';
import { isConfigSchema } from '@kbn/config-schema';
import type {
  SavedObjectsValidationSpec,
  SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { baseConfigSchema, baseZodSchema } from './base_schema';

/**
 * Generic validator function for a given {@link SavedObjectSanitizedDoc}
 *
 * @internal
 */
export type SavedObjectSanitizedDocValidator = (
  document: SavedObjectSanitizedDoc
) => SavedObjectSanitizedDoc;

/**
 * Takes a {@link SavedObjectsValidationSpec} and returns a validator function for a full
 * {@link SavedObjectSanitizedDoc}, with the spec applied to the object's `attributes`.
 *
 * @internal
 */
export const createSavedObjectSanitizedDocValidator = (
  attributesSchema?: SavedObjectsValidationSpec
): SavedObjectSanitizedDocValidator => {
  if (!attributesSchema) {
    return (document) => baseConfigSchema.validate(document);
  }

  if (isZod(attributesSchema)) {
    const fullSchema = baseZodSchema.extend({
      attributes: attributesSchema,
    });

    return (document) => {
      const result = fullSchema.safeParse(document);
      if (!result.success) {
        throw new Error(z.prettifyError(result.error));
      }
      return result.data;
    };
  }

  if (isConfigSchema(attributesSchema)) {
    const fullSchema = baseConfigSchema.extends({
      attributes: attributesSchema,
    });
    return (document) => fullSchema.validate(document);
  }

  throw new Error(
    'Unknown attributes schema. Must be defined with `@kbn/zod` or `@kbn/config-schema`.'
  );
};
