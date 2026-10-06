/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Type } from '@kbn/config-schema';
import type {
  SavedObjectsValidationSpec,
  SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
type SavedObjectSanitizedDocSchema = {
  [K in keyof Required<SavedObjectSanitizedDoc>]: Type<SavedObjectSanitizedDoc[K]>;
};
/**
 * Takes a {@link SavedObjectsValidationSpec} and returns a full schema representing
 * a {@link SavedObjectSanitizedDoc}, with the spec applied to the object's `attributes`.
 *
 * @internal
 */
export declare const createSavedObjectSanitizedDocSchema: (
  attributesSchema: SavedObjectsValidationSpec | undefined
) =>
  | import('@kbn/config-schema').ObjectType<
      Omit<SavedObjectSanitizedDocSchema, 'attributes'> & {
        attributes: SavedObjectsValidationSpec;
      }
    >
  | import('@kbn/config-schema').ObjectType<SavedObjectSanitizedDocSchema>;
export {};
